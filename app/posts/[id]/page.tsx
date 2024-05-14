import Head from "next/head";
import { getAllPostIds, getPostData } from "../../../lib/posts";

export async function generateStaticParams() {
  const params = getAllPostIds();
  return [params.map((param) => ({ id: param }))];
}

export default async function Post({ params }) {
  const post = await getPostData(params.id);
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
