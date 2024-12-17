import {
  ActionPostResponse,
  createActionHeaders,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
  MEMO_PROGRAM_ID,
  ACTIONS_CORS_HEADERS
} from "@solana/actions"

export const GET = async (req: Request) => {

  const payload: ActionGetResponse = {
    title: "Double or Nothing: Rock Paper Scissors",
    icon: "https://ivory-eligible-hamster-305.mypinata.cloud/ipfs/bafybeidi6qseek67vmmzc7x2ivhswer4dhhquxtzwubjvsq7li2mbd2t24",
    description: "",
    label: "Rock Paper Scissors",
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
                { label: "Scissors", value: "scissors" }
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
}

export const OPTIONS = GET
