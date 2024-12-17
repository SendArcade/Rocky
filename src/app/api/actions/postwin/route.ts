import {
  ActionPostResponse,
  createActionHeaders,
  createPostResponse,
  ActionPostRequest,
  MEMO_PROGRAM_ID,
  ACTIONS_CORS_HEADERS,
  ActionGetResponse,
  Action
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
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import { connectToDB } from '@/utils/database'
import Rocky from '@/models/rocky'
import Game from '@/models/game'

export const POST = async (req: Request) => {
  await connectToDB()

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return new Response('Missing required parameters', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS
      })
    }

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

    const game = await Game.findById(id)
    if (!game) {
      return new Response(JSON.stringify({ message: "Game not found" }), {
        status: 403,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      })
    }

    game.claimed = true
    await game.save()

    let image: string = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeidi6qseek67vmmzc7x2ivhswer4dhhquxtzwubjvsq7li2mbd2t24"

    if (game.outcome === "win") {
      if (game.choice === "rock") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeidgllxqnw2lg7yo4shcst2bhzdyda2764vr6etunbnte5nvbvmupm"
      else if (game.choice === "paper") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeieradq2pqgqtzbq6baiur4xowonz7o6qwo25uorrbu5ogjbwuviki"
      else if (game.choice === "scissors") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeierxn7vbuafnzhwlqy44snod4j4dibu76yl2kjlexur5hw674ahue"

    } else {
      if (game.choice === "rock") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeic7tewq2urllqoe3kt24vgucuznapu26btw5c6x2yufpku5nat6d4"
      else if (game.choice === "paper") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeiefe3m4lqtctqr4wyqd3cdbkerb2l27knqqiigsb7vekxrxajke3y"
      else if (game.choice === "scissors") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeiag5n6p3oxjtmdp7g434to5z34madxdbqs4jsa6bsfr4mxwg656yi"
    }

    const payload: Action = {
      type: "action",
      title: "Wanna play again?",
      icon: image,
      description: "",
      label: "",
      links: {
        actions: [
          {
            label: "Play",
            href: `/api/actions/backend?amount={amount}&choice={choice}`,
            parameters: [
              {
                type: "select",
                name: "amount",
                label: "Bet Amount in SOL",
                required: true,
                options: [
                  { label: "0.1 SOL", value: "0.1", selected: true },
                  { label: "0.05 SOL", value: "0.05" },
                  { label: "0.01 SOL", value: "0.01" }
                ]
              },
              {
                type: "radio",
                name: "choice",
                label: "Choose your move?",
                required: true,
                options: [
                  { label: "Rock", value: "rock", selected: true },
                  { label: "Paper", value: "paper" },
                  { label: "Scissors", value: "scissors" },
                ],
              },
            ],
            type: "transaction"
          }
        ]
      }
    }
  
    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS
    })

  } catch (err) {
    console.error(err)
    return Response.json("An unknown error occured", { status: 500 })
  }
}
