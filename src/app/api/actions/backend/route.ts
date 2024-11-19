import {
    ActionPostResponse,
    createActionHeaders,
    createPostResponse,
    ActionGetResponse,
    ActionPostRequest,
    MEMO_PROGRAM_ID,
  } from "@solana/actions";
  
  import { 
    clusterApiUrl,
    ComputeBudgetProgram,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction
  } from "@solana/web3.js";
  
import bs58 from "bs58";
import { kv } from '@vercel/kv';
let moneyPool = Number(await kv.get('moneyPool'))||0;

const headers = createActionHeaders({
    chainId: "mainnet", // or chainId: "devnet"
    actionVersion: "2.2.1", // the desired spec version
  });



export const POST = async (req: Request) => {
  try {
    // Extract the query parameters from the URL
    const url = new URL(req.url);
    const amount = url.searchParams.get("amount");
    const choice = url.searchParams.get("choice");

    // Ensure the required parameters are present
    if (!amount || !choice) {
      return new Response('Missing "amount" or "choice" in request', {
        status: 400,
        headers,
      });
    }
    const body: ActionPostRequest = await req.json();
    // Validate to confirm the user publickey received is valid before use
    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return new Response('Invalid "account" provided', {
        status: 400,
        headers, //Must include CORS HEADERS
      });
    }

    // Solana Blockchain Cluster (Set Mainnet "mainnet-beta" or Devnet "devnet")
    // If your RPC not present, it will use default devnet RPC provided to us via web3.js "clusterApiUrl("devnet")"
    // NOTE: "clusterApiUrl("devnet")" is not for mainnet use - for mainnet production launched Blinks, get your own RPC
    // For testing on mainnet - use "mainnet-beta"
    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl("mainnet-beta")
    );
    const web3 = require("@solana/web3.js");
    const sender = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_SENDER_SECRET!));

    const transaction = new Transaction().add(
      // note: `createPostResponse` requires at least 1 non-memo instruction
    //   ComputeBudgetProgram.setComputeUnitPrice({
    //     microLamports: 1000,
    //   }),
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(
          `User chose ${choice} with bet ${amount} SOL`,
          "utf8"
        ),
        keys: [{ pubkey: sender.publicKey, isSigner: true, isWritable: false }],
      })
    );
    // ensure the receiving account will be rent exempt
    const minimumBalance = await connection.getMinimumBalanceForRentExemption(
        0, // note: simple accounts that just store native SOL have `0` bytes of data
      );
      if (Number(amount) * LAMPORTS_PER_SOL < minimumBalance) {
        throw `account may not be rent exempt.`;
      }
    transaction.add(SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: sender.publicKey,
        lamports: Number(amount)*LAMPORTS_PER_SOL,
        }));

    // set the end user as the fee payer
    transaction.feePayer = account;

    // Get the latest Block Hash
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    let outcome: "win" | "lose" | "draw";
    const poolThreshold = 0.2 * moneyPool;
    if (moneyPool - (2 * Number(amount)) < poolThreshold) {
        // If profit condition is not met, declare as loss
        outcome = "lose";
    }
    else{
        // Determine game outcome based on 3:2:1 ratio of win:lose:draw
        const random = Math.floor(Math.random() * 6); // Generates 0 to 5
        if (random < 3) outcome = "win";
        else if (random < 5) outcome = "lose";
        else outcome = "draw";
    }

    if(outcome === "lose"){
        moneyPool += Number(amount);
        await kv.set('moneyPool',moneyPool.toString());
    }
    // Set CPU's choice based on user's choice and the decided outcome
    let cpuChoice: string;
    if (outcome === "win") {
      cpuChoice = choice === "R" ? "S" : choice === "P" ? "R" : "P"; // Win scenario
    } else if (outcome === "lose") {
      cpuChoice = choice === "R" ? "P" : choice === "P" ? "S" : "R"; // Lose scenario
    } else {
      cpuChoice = choice; // Draw scenario
    }
    function formatChoice(choice: string): string {
        switch (choice) {
          case "R":
            return "rock";
          case "S":
            return "scissors";
          case "P":
            return "paper";
          default:
            return choice;
        }
      }
    let image: string = "/icon.gif";
    let title: string = "Rock Paper Scissors";
    let description: string = "Let's play Rock Paper Scissors! If you win you get DOUBLE your betted SOL, if it's a tie you get your betted SOL back, and if you lose you lose your betted SOL.";
    let winAmount:Number = 0;
    if (outcome === "win") {
        if (choice === "R") image = "/RW.png";
        else if (choice === "P") image = "/PW.png";
        else if (choice === "S") image = "/SW.png";
        title = "You Won!";
        winAmount = Number(amount) * 2;
        description = `Congratulations! You chose ${formatChoice(choice)} and the CPU chose ${formatChoice(cpuChoice)}. You won ${winAmount} SOL! Claim your prize by clicking the button below now.`;
    }
    else if (outcome === "lose") {
        if (choice === "R") image = "/RL.png";
        else if (choice === "P") image = "/PL.png";
        else if (choice === "S") image = "/SL.png";
        title = "You Lost!";
        winAmount = 0;
        description = `Unlucky! You chose ${formatChoice(choice)} and the CPU chose ${formatChoice(cpuChoice)}. You lost ${amount} SOL. Try your luck again!`;
    }
    else {
        if (choice === "R") image = "/RD.png";
        else if (choice === "P") image = "/PD.png";
        else if (choice === "S") image = "/SD.png";
        title = "It's a Draw!";
        winAmount = Number(amount);
        description = `It's a draw! You chose ${formatChoice(choice)} and the CPU chose ${formatChoice(cpuChoice)}. You get your bet of ${amount} SOL back. Play again!`;
    }

 

    const payload: ActionPostResponse = await createPostResponse({
        fields: {
          type: "transaction",
          transaction,
          message: `Your choice was ${formatChoice(choice)} with a bet of ${amount} SOL.`,
          links: {
            next: {
                type: "inline",
                action: {
                    type: "action",
                    title: `${title}`,
                    icon: new URL(`${image}`,new URL(req.url).origin).toString(),
                    description: `${description}`,
                    label: "Rock Paper Scissors",
                    "links": {
                    "actions": winAmount!=0?[
                        {
                        "label": "Claim Prize", // button text
                        "href": `/api/actions/result?amount=${winAmount}`,
                        type: "transaction"
                        }
                    ]:[]
                    }
                },
            },
          },
        },
        // no additional signers are required for this transaction
        signers: [sender],
      });



    return Response.json(payload, {
      headers,
    });
  } catch (err) {
    console.log(err);
    const message = typeof err === "string" ? err : err?.toString() || "An unknown error occurred";
    return new Response(JSON.stringify({ message }), {
      status: 400,
      headers,
    });
  }
  
};