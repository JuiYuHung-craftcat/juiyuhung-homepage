import { getSortedPostsData } from "../lib/posts";

export default function Home() {
  const allPostsData = getSortedPostsData();
  return (
    <div className="max-w-3xl mx-auto px-8 pt-16">
      {allPostsData.map(({ id, date, title }) => (
        <div className="p-2 hover:bg-terminal_green hover:text-black" key={id}>
          <a href={`posts/${id}`}>
            <p className="font-bold text-lg"># {title}</p>@{date}
          </a>
        </div>
      ))}
    </div>
  );
}
