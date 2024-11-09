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
    Transaction,
    TransactionInstruction
  } from "@solana/web3.js";
  
  import bs58 from "bs58";

const headers = createActionHeaders({
    chainId: "devnet", // or chainId: "devnet"
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
      process.env.SOLANA_RPC! || clusterApiUrl("devnet")
    );
    const web3 = require("@solana/web3.js");
    const sender = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_SENDER_SECRET!));

    const transaction = new Transaction().add(
      // note: `createPostResponse` requires at least 1 non-memo instruction
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000,
      }),
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(
          `User chose ${choice} with bet ${amount} SOL`,
          "utf8"
        ),
        keys: [],
      })
    );
    // set the end user as the fee payer
    transaction.feePayer = account;

    // Get the latest Block Hash
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;


    // const nacl = require("tweetnacl");
    // let transaction = new web3.Transaction();
    // transaction.add(
    //     web3.SystemProgram.transfer({
    //       fromPubkey: sender.publickey,
    //       toPubkey: account,
    //       lamports: 1*LAMPORTS_PER_SOL,
    //     }),
    //   );
    //   await web3.sendAndConfirmTransaction(connection, transaction, [sender]);
    const connection2 = new Connection(
        process.env.SOLANA_RPC! || clusterApiUrl("devnet")
      );
      const web32 = require("@solana/web3.js");
      const sender2 = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_SENDER_SECRET!));
  
      const transaction2 = new Transaction().add(
        // note: `createPostResponse` requires at least 1 non-memo instruction
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 1000,
        }),
        new TransactionInstruction({
          programId: new PublicKey(MEMO_PROGRAM_ID),
          data: Buffer.from(
            `User chose ${choice} with bet ${amount} SOL`,
            "utf8"
          ),
          keys: [],
        })
      );
      transaction2.add(web3.SystemProgram.transfer({
          fromPubkey: sender.publicKey,
          toPubkey: account,
          lamports: 1*LAMPORTS_PER_SOL,
          }));
      // set the end user as the fee payer
      transaction2.feePayer = sender.publicKey;
  
      // Get the latest Block Hash
      transaction2.recentBlockhash = (
        await connection2.getLatestBlockhash()
      ).blockhash;
 
     

    const payload: ActionPostResponse = await createPostResponse({
        fields: {
          type: "transaction",
          transaction,
          message: `Your choice was ${choice} with a bet of ${amount} SOL.`,
        },
        // no additional signers are required for this transaction
        // signers: [sender],
      });
      await createPostResponse({
        fields: {
          type: "transaction",
          transaction: transaction2,
          message: `Your choice was ${choice} with a bet of ${amount} SOL.You won 1 sol`,
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