export const Header = () => {
  return (
    <header className="fixed w-full p-2 z-20 backdrop-blur-md bg-blue_primary">
      <div className="mx-auto max-w-3xl">
        <nav className="flex items-center gap-3 text-base">
          <a href="/" className="group">
            <h2 className="font-semibold tracking-tighter p-2 font-mplus text-lg">
              JuiYuHung
            </h2>
          </a>
          <div className="items-center gap-6 flex">
            <a href="/">Posts</a>
            <a href="/resume">Resume</a>
            <a href="https://github.com/JuiYuHung-craftcat">GitHub</a>
          </div>
        </nav>
      </div>
    </header>
  );
};
