import { getSortedPostsData } from "../lib/posts.ts";

interface PostData {
  id: string;
  date: string;
  title: string;
  type: string;
}

type PostDataArray = Array<PostData>;

export default function Home() {
  const allPostsData: PostDataArray = getSortedPostsData();
  return (
    <div className="max-w-3xl mx-auto px-8 pt-24">
      <p className="text-center fond-bold md:text-2xl text-xl mt-8 mb-2 bg-terminal_green text-black rounded py-2">
        Technical
      </p>
      {allPostsData.map(
        ({ id, date, title, type }) =>
          type == "tech" && (
            <a key={id} href={`posts/${id}`}>
              <div className="mb-2 p-2 hover:bg-terminal_green hover:text-black border-terminal_green border-2 border-dashed">
                <p className="md:text-lg text-sm">{title}</p>
                <p className="md:text-base text-sm text-right mt-2">{date}</p>
              </div>
            </a>
          ),
      )}
      <p className="text-center fond-bold md:text-2xl text-xl mt-8 mb-2 bg-terminal_green text-black rounded py-2">
        Blog
      </p>
      {allPostsData.map(
        ({ id, date, title, type }) =>
          type == "blog" && (
            <a key={id} href={`posts/${id}`}>
              <div className="mb-2 p-2 hover:bg-terminal_green hover:text-black border-terminal_green border-2 border-dashed">
                <p className="md:text-lg text-sm">{title}</p>
                <p className="md:text-base text-sm text-right mt-2">{date}</p>
              </div>
            </a>
          ),
      )}
    </div>
  );
}
