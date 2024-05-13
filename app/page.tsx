import { getSortedPostsData } from "../lib/posts";

export default function Home() {
  const allPostsData = getSortedPostsData();
  return (
    <div className="max-w-3xl mx-auto pl-4 pr-4 pt-16">
      {allPostsData.map(({ id, date, title }) => (
        <div className="p-2" key={id}>
          <a href={`posts/${id}`}>
            <p className="font-bold text-lg"># {title}</p>
            {id}
            <br />
            {date}
          </a>
        </div>
      ))}
    </div>
  );
}
