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

    if (!body.signature) {
      return new Response(JSON.stringify({ message: "Signature not found" }), {
        status: 403,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      })
    }

    // Check if the signature already exists in other documents
    const existingGame = await Game.findOne({ signature: body.signature, _id: { $ne: id } });
    if (existingGame) {
      return new Response(JSON.stringify({ message: "Signature already used" }), {
        status: 403,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      })
    }

    const rocky = await Rocky.findById(id)
    if (!rocky) {
      return new Response(JSON.stringify({ message: "Rocky not found" }), {
        status: 403,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      })
    }

    if (account.toString() !== rocky.address) {
      return new Response(JSON.stringify({ message: "Account does not match Rocky address" }), {
        status: 403,
        headers: {
          ...ACTIONS_CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      })
    }

    const game = await Game.create({
      address: account.toString(),
      signature: body.signature,
      choice: rocky.choice,
      amount: rocky.amount,
      outcome: rocky.outcome
    })

    console.log("Game created: ", game)

    let image: string = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeidi6qseek67vmmzc7x2ivhswer4dhhquxtzwubjvsq7li2mbd2t24"
    let title: string = "Rock Paper Scissors"
    let description: string = ""
    let winAmount: Number = 0
    let label: string = ""
    let cpuChoice: string = ""

    if (game.outcome === "win") {
      cpuChoice = game.choice === "rock" ? "scissors" : game.choice === "paper" ? "rock" : "paper" // Win scenario

    } else if (game.outcome === "lose") {
      cpuChoice = game.choice === "rock" ? "paper" : game.choice === "paper" ? "scissors" : "rock" // Lose scenario

    } else {
      cpuChoice = game.choice // Draw scenario
    }

    if (game.outcome === "win") {
      console.log("Outcome:", game.outcome)
      console.log("Winning")
      if (game.choice === "rock") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeidgllxqnw2lg7yo4shcst2bhzdyda2764vr6etunbnte5nvbvmupm"
      else if (game.choice === "paper") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeieradq2pqgqtzbq6baiur4xowonz7o6qwo25uorrbu5ogjbwuviki"
      else if (game.choice === "scissors") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeierxn7vbuafnzhwlqy44snod4j4dibu76yl2kjlexur5hw674ahue"
      title = "You Won!"
      winAmount = Number(game.amount) * 2
      console.log("Win amount:", winAmount)
      description = `Congratulations! You chose ${game.choice} and the opponent chose ${cpuChoice}. You won 2x in SEND! Claim your prize by clicking the button below now.`
      label = "Claim Prize!"

    } else if (game.outcome === "lose") {
      console.log("Outcome:", game.outcome)
      console.log("Losing")
      if (game.choice === "rock") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeibiuaiag2ezm47pq5xstprpk2hr7b6hgmn4wrarcx5pxshue3vyly"
      else if (game.choice === "paper") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeie7mjer7o42e2teteiol2dfvixtzgwrwh7ntdjclsjiinbj2wnp7m"
      else if (game.choice === "scissors") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeihfyvc2ch2whinfuygteiqsx7c7nah5743pt736hutpkzueqi5thm"
      title = "You Lost!"
      winAmount = 0
      console.log("Win amount:", winAmount)
      description = `Unlucky! You chose ${game.choice} and the opponent chose ${cpuChoice}. You lost ${game.amount} SOL. Try your luck again!`
      label = "Play Again!"

    } else {
      console.log("Outcome:", game.outcome)
      console.log("Drawing")
      if (game.choice === "rock") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeic7tewq2urllqoe3kt24vgucuznapu26btw5c6x2yufpku5nat6d4"
      else if (game.choice === "paper") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeiefe3m4lqtctqr4wyqd3cdbkerb2l27knqqiigsb7vekxrxajke3y"
      else if (game.choice === "scissors") image = "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeiag5n6p3oxjtmdp7g434to5z34madxdbqs4jsa6bsfr4mxwg656yi"
      title = "It's a Draw!"
      winAmount = Number(game.amount)
      console.log("Win amount:", winAmount)
      description = `It's a draw! You chose ${game.choice} and the opponent chose ${cpuChoice}. You get your bet back in SEND. Play again!`
      label = "Claim Back!"
    }

    const payload: Action = (winAmount!=0) ? {
      type: "action",
      icon: image,
      title: title,
      description: description,
      label: label,
      links: {
        actions: [
          {
            type: "transaction",
            label: label,
            href: `/api/actions/won?id=${game._id.toString()}`
          }
        ]
      }
    } : {
      type: "action",
      title: "You lost! Wanna try again?",
      icon: image,
      description: `\nUnlucky! You chose ${game.choice} and the opponent chose ${cpuChoice}. You lost ${game.amount} SOL. Wanna try again?`,
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

    return Response.json(payload)

  } catch (err) {
    console.error(err)
    return Response.json("An unknown error occured", { status: 500 })
  }
}
