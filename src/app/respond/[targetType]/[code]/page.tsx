import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { fetchPublicPrompt } from '@/lib/promptApi';
import { fetchPublicStory } from '@/lib/storyApi';
import { parseReplyAs } from '@/lib/replies/routes';
import ReplyFlow from '@/components/replies/ReplyFlow';
import { detectPlatform } from '@/lib/platform';

type Params = { targetType: string; code: string };
type SearchParams = Record<string, string | string[] | undefined>;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { targetType, code } = await params;
  if (targetType !== 'prompt' && targetType !== 'story') notFound();

  const sp = await searchParams;
  const replyAs = parseReplyAs(sp);
  const ua = (await headers()).get('user-agent') || '';
  const platform = detectPlatform(ua);

  // Fetch sender context for the composer header
  let senderName = '';
  let promptText = '';

  if (targetType === 'prompt') {
    const result = await fetchPublicPrompt(code);
    if (result.status === 'ok') {
      senderName = result.data.prompt?.author?.firstName ?? '';
      promptText = result.data.prompt?.content ?? '';
    }
  } else {
    const result = await fetchPublicStory(code);
    if (result.status === 'ok') {
      senderName = result.data.prompt?.author?.firstName ?? '';
      promptText = result.data.prompt?.content ?? '';
    }
  }

  return (
    <ReplyFlow
      targetType={targetType as 'prompt' | 'story'}
      code={code}
      platform={platform}
      replyAs={replyAs}
      senderName={senderName}
      promptText={promptText}
    />
  );
}
