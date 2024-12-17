import {
  ActionPostResponse,
  createActionHeaders,
  createPostResponse,
  ActionPostRequest,
  MEMO_PROGRAM_ID,
  ACTIONS_CORS_HEADERS
} from "@solana/actions"
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
} from "@solana/web3.js"
import bs58 from "bs58"
import { connectToDB } from '@/utils/database'
import Rocky from '@/models/rocky'
import crypto from 'crypto'

const ADDRESS = new PublicKey("HBQwJcDCqEHr8b7LGzww1t8NxAaM9rQjA7QHSuWL7jnD")

export const POST = async (req: Request) => {
  await connectToDB()

  try {
    // Extract the query parameters from the URL
    const url = new URL(req.url)
    const amount = url.searchParams.get("amount")
    const choice = url.searchParams.get("choice")
    // const player = url.searchParams.get("player")
    let outcome: "win" | "lose" | "draw"
    outcome = "lose"

    let label: string = ""

    const body: ActionPostRequest = await req.json()
    // Validate to confirm the user publickey received is valid before use
    let account: PublicKey
    try {
      account = new PublicKey(body.account)
    } catch (err) {
      return new Response('Invalid "account" provided', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS
      })
    }

    if (!amount || !choice) {
      return new Response('Missing required parameters', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS
      })
    }

    const connection = new Connection(`https://staked.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`)
    const transaction = new Transaction()

    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000
      }),
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(`${choice}_${amount}`, "utf8"),
        keys: []
      }),
      SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: ADDRESS,
        lamports: Number(amount) * LAMPORTS_PER_SOL
      })
    )

    transaction.feePayer = account

    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash

    // Determine game outcome based on 45% lose, 30% win, 25% draw
    // const random = Math.floor(Math.random() * 100) // Generates 0 to 99
    // console.log("Random number generated:", random)

    // if (random < 30) outcome = "win" // 30% chance
    // else if (random < 75) outcome = "lose" // 45% chance
    // else outcome = "draw" // 25% chance
    // console.log("Outcome:", outcome)

    const randomByte = crypto.randomBytes(1)[0]; // Generate one random byte
    console.log("Random byte generated:", randomByte);

    if (randomByte < 77) {  // Approximately 30%
      outcome = "win"; 
    } else if (randomByte < 192) { // Approximately 45% 
      outcome = "lose";
    } else {
      outcome = "draw"; // Approximately 25%
    }

    console.log("Outcome:", outcome);

    // Set CPU's choice based on user's choice and the decided outcome
    let cpuChoice: string
    if (outcome === "win") {
      cpuChoice = choice === "rock" ? "scissors" : choice === "paper" ? "rock" : "paper" // Win scenario

    } else if (outcome === "lose") {
      cpuChoice = choice === "rock" ? "paper" : choice === "paper" ? "scissors" : "rock" // Lose scenario

    } else {
      cpuChoice = choice
    }

    const r = await Rocky.create({
      address: account.toString(),
      choice: choice,
      amount: Number(amount),
      outcome: outcome
    })

    console.log("Rocky ID:", r._id)

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        links: {
          next: {
            type: "post",
            href: `/api/actions/outcome?id=${r._id.toString()}`
          }
        }
      }
    })

    console.log("Payload:", payload)

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    })

  } catch (err) {
    console.error(err)
    return Response.json("An unknown error occured", { status: 500 })
  }
}
