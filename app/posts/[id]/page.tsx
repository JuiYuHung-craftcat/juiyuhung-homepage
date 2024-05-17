import Head from "next/head";
import { getAllPostIds, getPostData } from "../../../lib/posts";

export async function generateStaticParams() {
  const params = getAllPostIds();
  return [params.map((param) => ({ id: param }))];
}

interface PostType {
  id: string;
  title: string;
  date: string;
  contentHtml: string;
}

export default async function Post({ params }: { params: { id: string } }) {
  const post: PostType = (await getPostData(params.id)) as any;
  return (
    <div className="pt-24 px-4 mx-auto max-w-3xl">
      <Head>
        <title>{post.id}</title>
      </Head>
      <article>
        <h1 className="text-xl font-bold">{post.title}</h1>
        <h2>{post.date}</h2>
        <br />
        <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
      </article>
    </div>
  );
}
