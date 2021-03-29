import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';
import Header from '../../components/Header';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
        type: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  const readTime = post.data.content.reduce((sumTotal, content) => {
    const textTime = RichText.asText(content.body).split(' ').length;
    return Math.ceil(sumTotal + textTime / 200);
  }, 0);

  if (router.isFallback) {
    return <p>Carregando...</p>;
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | Spacetraveling</title>
      </Head>

      <main className={commonStyles.container}>
        <Header />

        <img
          className={styles.banner}
          src={post.data.banner.url}
          alt={post.data.title}
        />
        <div className={styles.content}>
          <strong>{post.data.title}</strong>
          <div>
            <time>
              <FiCalendar size={20} />
              {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })}
            </time>
            <cite>
              <FiUser size={20} />
              {post.data.author}
            </cite>
            <time>
              <FiClock size={20} />
              {readTime} min
            </time>
          </div>

          {post.data.content.map(content => (
            <article key={content.heading}>
              <strong>{content?.heading}</strong>
              {content.body.map((body, index) => {
                const key = index;
                return body.type === 'list-item' ? (
                  <ul key={key}>
                    <li>{body.text}</li>
                  </ul>
                ) : (
                  <p key={key}>{body.text}</p>
                );
              })}
            </article>
          ))}
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
    }
  );

  const slugs = postsResponse.results.map(slug => slug.uid);

  return {
    paths: slugs.map(slug => {
      return {
        params: { slug },
      };
    }),
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: content.body.map(body => {
            return {
              text: body.text,
              type: body.type,
              spans: [...body.spans],
            };
          }),
        };
      }),
    },
  };

  return {
    props: {
      post,
    },
  };
};
