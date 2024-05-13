import Head from "next/head";
import { getAllPostIds, getPostData } from "../../../lib/posts";

export async function generateStaticParams() {
  const params = getAllPostIds();
  return [params.map((param) => ({ id: param }))];
}

export default async function Post({ params }) {
  const post = await getPostData(params.id);
  return (
    <div className="p-24">
      <Head>
        <title>{post.id}</title>
      </Head>
      <article>
        <h1>{post.id}</h1>
        <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
      </article>
    </div>
  );
}
