import { assetUrl } from '@/lib/art-assets';

/** A visual response to the existing final-island completion event. */
export default function ChapterGateResponse({ language }: { language: 'en' | 'zh' }) {
    return <div className="art-gate-response" style={{ backgroundImage: 'url("' + assetUrl('/art/scenes/second-gate.webp') + '")' }}>
        <div className="art-gate-response-light" aria-hidden="true" />
        <span className="art-gate-response-seal" aria-hidden="true">◇</span>
        <span className="art-gate-response-caption">{language === 'zh' ? '第二道门 · 证明完成' : 'THE SECOND GATE · PROOF COMPLETE'}</span>
    </div>;
}
