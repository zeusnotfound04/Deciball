import { Metadata } from 'next';
import { prisma } from '@/app/lib/db';

type Props = {
  params: Promise<{ spaceId: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { spaceId } = await params;
  const baseUrl = process.env.NEXTAUTH_URL || 'https://deciball.zeusnotfound.codes';

  try {
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      include: { host: { select: { name: true, username: true, pfpUrl: true } } },
    });

    if (!space) {
      return {
        title: 'Space Not Found | Deciball',
        description: 'This music space does not exist.',
      };
    }

    const hostName = space.host?.name || space.host?.username || 'Someone';
    const hostPfp = space.host?.pfpUrl || '';
    const spaceName = space.name;

    const ogUrl = `${baseUrl}/api/og?spaceName=${encodeURIComponent(spaceName)}&hostName=${encodeURIComponent(hostName)}&hostPfp=${encodeURIComponent(hostPfp)}`;

    return {
      title: `${spaceName} | Deciball`,
      description: `Join ${hostName} in "${spaceName}" on Deciball to listen along together.`,
      openGraph: {
        title: `Join ${hostName} in Deciball`,
        description: `Listen along in "${spaceName}"`,
        images: [{ url: ogUrl, width: 1200, height: 630, alt: `${spaceName} on Deciball` }],
        type: 'website',
        siteName: 'Deciball',
      },
      twitter: {
        card: 'summary_large_image',
        title: `Join ${hostName} in Deciball`,
        description: `Listen along in "${spaceName}"`,
        images: [ogUrl],
      },
    };
  } catch {
    return {
      title: 'Deciball',
      description: 'Listen to music together in real-time.',
    };
  }
}

export default function SpaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
