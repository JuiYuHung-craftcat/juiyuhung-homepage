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
    <div className="max-w-3xl mx-auto px-8 pt-24">
      {allPostsData.map(({ id, date, title }) => (
        <a key={id} href={`posts/${id}`}>
          <div className="mb-2 p-2 hover:bg-terminal_green hover:text-black border-terminal_green border-2 border-dashed">
            <p className="font-bold text-lg"># {title}</p>@{date}
          </div>
        </a>
      ))}
    </div>
  );
}
