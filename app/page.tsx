import { getSortedPostsData } from "../lib/posts.ts";

interface PostData {
  id: string;
  date: string;
  title: string;
}

type PostDataArray = Array<PostData>;

export default function Home() {
  const allPostsData: PostDataArray = getSortedPostsData();
  return (
    <div className="max-w-3xl mx-auto px-8 pt-16">
      {allPostsData.map(({ id, date, title }) => (
        <a key={id} href={`posts/${id}`}>
          <div className="p-2 hover:bg-terminal_green hover:text-black">
            <p className="font-bold text-lg"># {title}</p>@{date}
          </div>
        </a>
      ))}
    </div>
  );
}
