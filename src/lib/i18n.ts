// 언어·주소 도우미. 한국어는 /, 영어는 /en/ 아래에 같은 구조로 만든다.
export const LANGS = ['ko', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export type L10n = { ko: string; en: string };

// 저장소 이름으로 배포하면 base가 /repo가 되므로, 모든 내부 링크는 이 함수로 만든다.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** 언어와 무관한 경로('/works/x/')를 해당 언어의 실제 주소로 바꾼다. */
export function href(lang: Lang, path = '/'): string {
  return `${BASE}${lang === 'en' ? '/en' : ''}${path}`;
}
/** public/ 안의 파일 경로('media/x.jpg')를 주소로 바꾼다. */
export function asset(path: string): string {
  return `${BASE}/${path.replace(/^\//, '')}`;
}
/** 절대 URL (canonical, OG, sitemap용) */
export function absolute(path: string, site: URL | undefined): string {
  return new URL(path, site ?? 'https://bahareh-toushkan.github.io').href;
}
export function tr(v: L10n | undefined, lang: Lang): string {
  return v ? v[lang] || v.ko : '';
}

export const UI = {
  ko: {
    skip: '본문으로 건너뛰기',
    nav: '주 메뉴',
    works: '작품',
    about: '소개',
    contact: '연락',
    langLabel: '언어',
    otherLang: 'English',
    otherLangCode: 'en',
    sec: '초',
    shots: '생성 컷',
    format: '형식',
    length: '길이',
    date: '날짜',
    generate: '생성',
    edit: '편집',
    summary: '한 줄 요약',
    pipeline: '파이프라인',
    scenes: '장면',
    prompts: '프롬프트',
    compare: '전후 비교',
    compareRange: '전후 비교 위치 조절',
    before: '전',
    after: '후',
    copy: '복사',
    copied: '복사됨',
    watchOnInstagram: '인스타그램에서 보기',
    watchOnYoutube: '유튜브에서 보기',
    allWorks: '모든 작품',
    prev: '이전 작품',
    next: '다음 작품',
    worksHeading: '작품',
    contactLead: '협업·외주·채용 문의는 이메일이나 인스타그램 DM으로 주세요.',
    email: '이메일',
    instagramDm: '인스타그램 DM',
    github: 'GitHub',
    notFound: '페이지를 찾을 수 없어요',
    notFoundLead: '주소가 바뀌었거나 없는 페이지예요.',
    home: '처음으로',
    videoFallback: '이 브라우저에서는 영상을 재생할 수 없어요.',
    aiNote: '등장 인물과 장면은 AI로 생성했습니다.'
  },
  en: {
    skip: 'Skip to content',
    nav: 'Main menu',
    works: 'Works',
    about: 'About',
    contact: 'Contact',
    langLabel: 'Language',
    otherLang: '한국어',
    otherLangCode: 'ko',
    sec: 's',
    shots: 'Generated shots',
    format: 'Format',
    length: 'Length',
    date: 'Date',
    generate: 'Generate',
    edit: 'Edit',
    summary: 'In short',
    pipeline: 'Pipeline',
    scenes: 'Scenes',
    prompts: 'Prompts',
    compare: 'Before / after',
    compareRange: 'Adjust before/after position',
    before: 'Before',
    after: 'After',
    copy: 'Copy',
    copied: 'Copied',
    watchOnInstagram: 'Watch on Instagram',
    watchOnYoutube: 'Watch on YouTube',
    allWorks: 'All works',
    prev: 'Previous',
    next: 'Next',
    worksHeading: 'Works',
    contactLead: 'For collaborations, commissions or hiring, email me or send an Instagram DM.',
    email: 'Email',
    instagramDm: 'Instagram DM',
    github: 'GitHub',
    notFound: 'Page not found',
    notFoundLead: 'The address changed or the page does not exist.',
    home: 'Home',
    videoFallback: 'Your browser cannot play this video.',
    aiNote: 'People and scenes are AI-generated.'
  }
} satisfies Record<Lang, Record<string, string>>;

/** '2026-10-13' → '2026.10.13', '2026-10' → '2026.10' */
export function formatDate(d: string): string {
  return d.replace(/-/g, '.');
}
