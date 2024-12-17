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
import {
  NATIVE_MINT,
  createSyncNativeInstruction,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createCloseAccountInstruction,
  createTransferInstruction,
  createBurnInstruction
} from "@solana/spl-token"
import bs58 from "bs58"
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import { connectToDB } from '@/utils/database'
import Game from '@/models/game'

const ADDRESS = new PublicKey("HBQwJcDCqEHr8b7LGzww1t8NxAaM9rQjA7QHSuWL7jnD")

const SENDCOIN_MINT_ADDRESS = new PublicKey("SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa")

export const POST = async (req: Request) => {
  await connectToDB()

  try {
    const body: any = await req.json()
    console.log("Fuckin Body: ", body)

    let account: PublicKey
    try {
      account = new PublicKey(body.account)
    } catch (err) {
      return new Response(JSON.stringify({ message: "Invalid account" }), {
        status: 403,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      })
    }

    const url = new URL(req.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return new Response('Missing required parameters', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS
      })
    }

    const game = await Game.findById(id)
    console.log("Game: ", game)

    if (!game) {
      game.fake = true
      await game.save()

      return new Response(JSON.stringify({ message: "Game not found" }), {
        status: 403,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      })
    }

    const signature = game.signature

    let txData
    let attempts = 0
    const maxAttempts = 20

    while (attempts < maxAttempts) {
      console.log(`Attempt number: ${attempts + 1}`)

      const txResponse = await fetch(`https://api.helius.xyz/v0/transactions?api-key=${process.env.HELIUS_API_KEY}`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transactions: [signature]
        })
      })

      txData = await txResponse.json()

      if (txData && Object.keys(txData).length > 0) {
        console.log("Tx Data: ", txData)
        break
      }

      attempts++
      if (attempts >= maxAttempts) {
        game.fake = true
        await game.save()

        return new Response(JSON.stringify({ message: "Payment could not be confirmed!" }), {
          status: 403,
          headers: {
            ...ACTIONS_CORS_HEADERS,
            'Content-Type': 'application/json'
          }
        })
      }

      await new Promise(resolve => setTimeout(resolve, 500)) // wait for 0.5 seconds
    }

    console.log(txData[0].nativeTransfers)

    if (txData[0].nativeTransfers[0].fromUserAccount !== account.toBase58()) {
      game.fake = true
      await game.save()

      return new Response(JSON.stringify({ message: "Payment was not made by you!" }), {
        status: 403,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      })
    }

    if (txData[0].nativeTransfers[0].toUserAccount !== ADDRESS.toBase58()) {
      game.fake = true
      await game.save()

      return new Response(JSON.stringify({ message: "Payment was not made to the admin!" }), {
        status: 403,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      })
    }

    if (txData[0].nativeTransfers[0].amount !== game.amount * LAMPORTS_PER_SOL) {
      game.fake = true
      await game.save()

      return new Response(JSON.stringify({ message: "Payment amount was incorrect!" }), {
        status: 403,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      })
    }

    if (game.claimed) {
      return new Response(JSON.stringify({ message: "Reward already claimed!" }), {
        status: 403,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      })
    }

    const connection = new Connection(`https://staked.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`)

    const secretClient = new SecretManagerServiceClient()
    const [response] = await secretClient.accessSecretVersion({ name: `projects/435887166123/secrets/rocky-private-key/versions/1` })
    if (!response.payload || !response.payload.data) {
      throw new Error('Secret payload is null or undefined')
    }
    const PRIVATE_KEY = response.payload.data.toString()

    // const PRIVATE_KEY = process.env.PRIVATE_KEY as string

    const KEYPAIR = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY))

    const transaction = new Transaction()

    const transferAmountSol = game.outcome === "win" ? 2 * Number(game.amount) : Number(game.amount)
    const transferAmountLamports = transferAmountSol * LAMPORTS_PER_SOL

    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 400_000
      }),
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 300_000 * 1
      }),
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(
          `${game.outcome}_${transferAmountSol}`,
          "utf8"
        ),
        keys: []
      })
    )

    const quoteResponse = await (
      await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112\
&outputMint=SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa\
&amount=${transferAmountLamports}\
&slippageBps=200`)
    ).json()

    console.log({ quoteResponse })

    const outAmountThreshold = quoteResponse.otherAmountThreshold

    const ADMIN_WSOL_ATA = await getAssociatedTokenAddress(NATIVE_MINT, ADDRESS)
    console.log("Admin's Wrapped SOL ATA: ", ADMIN_WSOL_ATA.toBase58())

    const ADMIN_SEND_ATA = await getAssociatedTokenAddress( SENDCOIN_MINT_ADDRESS, ADDRESS )
    console.log("Admin's SEND ATA: ", ADMIN_SEND_ATA.toBase58())

    const USER_SEND_ATA = await getAssociatedTokenAddress(SENDCOIN_MINT_ADDRESS, account)
    console.log("User's SEND ATA: ", USER_SEND_ATA.toBase58())

    const WSOL_Info = await connection.getAccountInfo(ADMIN_WSOL_ATA)
    const SEND_Info = await connection.getAccountInfo(USER_SEND_ATA)
    const ADMIN_SEND_Info = await connection.getAccountInfo(ADMIN_SEND_ATA)

    if (!WSOL_Info) {
      console.log(`Admin's Wrapped SOL ATA doesn't exist. Creating one now...`)
      const ATAIx = createAssociatedTokenAccountInstruction(
        account,
        ADMIN_WSOL_ATA,
        ADDRESS,
        NATIVE_MINT
      )
      transaction.add(ATAIx)
    }

    if (!SEND_Info) {
      console.log(`Send ATA doesn't exist. Creating one now...`)
      const ATAIx = createAssociatedTokenAccountInstruction(
        account,
        USER_SEND_ATA,
        account,
        SENDCOIN_MINT_ADDRESS
      )
      transaction.add(ATAIx)
    }

    if (!ADMIN_SEND_Info) {
      console.log(`Send ATA for ADMIN doesn't exist. Creating one now...`)
      const ATAIx = createAssociatedTokenAccountInstruction(
        account,
        ADMIN_SEND_ATA,
        ADDRESS,
        SENDCOIN_MINT_ADDRESS
      )
      transaction.add(ATAIx)
    }

    // Get serialized transactions for the swap
    const instructions = await (
      await fetch('https://quote-api.jup.ag/v6/swap-instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: ADDRESS.toString(),
          dynamicComputeUnitLimit: true
        })
      })
    ).json()

    if (instructions.error) {
      throw new Error("Failed to get swap instructions: " + instructions.error)
    }

    const { swapInstruction: swapInstructionPayload } = instructions

    const deserializeInstruction = (instruction: any) => {
      return new TransactionInstruction({
        programId: new PublicKey(instruction.programId),
        keys: instruction.accounts.map((key: any) => ({
          pubkey: new PublicKey(key.pubkey),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        })),
        data: Buffer.from(instruction.data, "base64"),
      })
    }

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: ADDRESS,
        toPubkey: ADMIN_WSOL_ATA,
        lamports: transferAmountLamports,
      }),
      createSyncNativeInstruction(ADMIN_WSOL_ATA),
      deserializeInstruction(swapInstructionPayload)
    )

    transaction.add(
      createTransferInstruction(
        ADMIN_SEND_ATA,
        USER_SEND_ATA,
        ADDRESS,
        outAmountThreshold
      )
    )

    // transaction.add(
    //   ComputeBudgetProgram.setComputeUnitPrice({
    //     microLamports: 1000
    //   }),
    //   new TransactionInstruction({
    //     programId: new PublicKey(MEMO_PROGRAM_ID),
    //     data: Buffer.from(
    //       `${game.outcome}_${transferAmountSol}`,
    //       "utf8"
    //     ),
    //     keys: []
    //   }),
    //   SystemProgram.transfer({
    //     fromPubkey: KEYPAIR.publicKey,
    //     toPubkey: account,
    //     lamports: transferAmountSol * LAMPORTS_PER_SOL
    //   })
    // )

    transaction.feePayer = account
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        links: {
          next: {
            type: "post",
            href: `/api/actions/postwin?id=${game._id.toString()}`
          }
        }
      },
      signers: [KEYPAIR]
    })

    return Response.json(payload)

  } catch (err) {
    console.error(err)
    return Response.json("An unknown error occured", { status: 500 })
  }
}
