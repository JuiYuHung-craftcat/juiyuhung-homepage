export const Header = () => {
  return (
    <header className="fixed w-full p-2 z-20 backdrop-blur-md">
      <div className="mx-auto max-w-3xl">
        <nav className="flex items-center gap-12 text-base">
          <a href="/" className="group">
            <h2 className="font-semibold tracking-tighter p-2 font-mplus text-lg">
              JuiYuHung
            </h2>
          </a>
          <div className="items-center gap-6 flex">
            <a href="/">POSTS</a>
            <a href="/resume">RESUME</a>
            <a href="https://github.com/JuiYuHung-craftcat">GITHUB</a>
          </div>
        </nav>
      </div>
    </header>
  );
};
