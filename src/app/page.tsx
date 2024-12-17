import Image from "next/image"

export default function Home() {
  return (
    <div>
    <section className="relative h-screen bg-black pt-12 overflow-hidden sm:pt-16">
      <div className="relative px-4 mx-auto sm:px-6 lg:px-8 max-w-7xl">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-normal tracking-widest uppercase">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500 text-2xl">
              Win SEND
            </span>
          </p>
          <h1 className="mt-8 text-4xl font-normal text-white sm:text-5xl lg:text-6xl xl:text-7xl">
            Double or Nothing: Rock Paper Scissors
          </h1>
          <div className="flex flex-col items-center justify-center px-8 mt-12 space-y-5 sm:space-y-0 sm:px-0 sm:space-x-5 sm:flex-row">
            <div className="relative inline-flex items-center justify-center sm:w-auto group">
              <div className="absolute transition-all duration-200 rounded-full -inset-px bg-gradient-to-r from-cyan-500 to-purple-500 group-hover:shadow-lg group-hover:shadow-cyan-500/50"></div>
              <button
                className="relative inline-flex items-center justify-center px-6 py-2 text-base font-normal text-white bg-black border border-transparent rounded-full"
              >
                <a
                href="https://sendarcade.fun">Play Here!</a>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
  )
}
