import { NextRequest } from 'next/server'

export const GET = async (req: NextRequest) => {
  return Response.json({
    extendedDescription: `**Play Rock Paper Scissors on Blinks to Win SEND!**\n\n
You can bet an amount and select between rock paper scissors to play.\n\n
There can be three out comes - Win, Draw, Lose:\n
- Win: You get 2x your bet in SEND\n
- Draw: You get your bet back in SEND\n
- Lose: You lose your bet\n`
  })
}
