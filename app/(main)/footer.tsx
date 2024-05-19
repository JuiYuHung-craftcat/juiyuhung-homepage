export const Footer = () => {
  const today = new Date();

  return (
    <footer className="text-terminal_green p-4 text-center">
      &copy; {today.getFullYear()} <a href="/">JuiYu Hung</a>. All rights
      reserved.
    </footer>
  );
};
