import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CustomerAiModal } from '@/components/CustomerAiModal';
import { parseVoiceAudioIntent } from '@/lib/gemini';

let mockUser: any = null;

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, className, onClick }: any) => (
    <a href={to} className={className} onClick={onClick}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: vi.fn(),
  }),
}));

vi.mock('@/lib/aiKnowledgeEngine', () => ({
  queryAiKnowledge: vi.fn(() => ({ answer: 'Mock Answer', confidence: 0.9 })),
  queryRagMicroservice: vi.fn(async () => ({ answer: 'Mock RAG', confidence: 0.9 })),
  syncLearnedSolutionsFromFirestore: vi.fn(async () => {}),
  voteLearnedSolution: vi.fn(async () => {}),
}));

describe('Customer AI Concierge Multimodal Voice Booking', () => {
  beforeEach(() => {
    mockUser = {
      id: 'cust-101',
      name: 'Arun Kumar',
      role: 'customer',
      city: 'Bengaluru',
    };
    vi.clearAllMocks();
  });

  it('renders CustomerAiModal with voice controls and Indic language strip', () => {
    const html = renderToString(
      <CustomerAiModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(html).toContain('AI Concierge');
    expect(html).toContain('Voice &amp; Chat');
    expect(html).toContain('Speech &amp; Chat Language:');
    expect(html).toContain('English');
    expect(html).toContain('ಕನ್ನಡ');
    expect(html).toContain('हिन्दी');
    expect(html).toContain('aria-label="Microphone Speech Input"');
  });

  it('provides quick 1-tap repair suggestions for instant booking without typing', () => {
    const html = renderToString(
      <CustomerAiModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(html).toContain('Tap leaking / Pipe repair');
    expect(html).toContain('Fan humming / MCB tripping');
    expect(html).toContain('AC blowing warm air');
    expect(html).toContain('ಮೋಟಾರ್ ಪಂಪ್ ನೀರು ಎತ್ತುತ್ತಿಲ್ಲ');
  });

  it('parses audio intent fallback seamlessly using parseVoiceAudioIntent', async () => {
    const res = await parseVoiceAudioIntent('data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8=', 'kn-IN');
    expect(res.success).toBe(true);
    expect(res.transcript).toBeDefined();
    expect(res.intent).toBeDefined();
    expect(res.intent?.serviceId).toBeDefined();
  });

  it('accurately auto-detects user inquiry language across Kannada, Hindi, and English', async () => {
    const { detectLanguageAuto } = await import('@/lib/gemini');

    // 1. Kannada Script (Exact query from user screenshot: "ನೀರಿನಲ್ಲಿ..")
    const knResult = detectLanguageAuto('ನೀರಿನಲ್ಲಿ..');
    expect(knResult.code).toBe('kn-IN');
    expect(knResult.name).toBe('Kannada');

    // 2. Devanagari Hindi Script
    const hiResult = detectLanguageAuto('नल से पानी टपक रहा है');
    expect(hiResult.code).toBe('hi-IN');
    expect(hiResult.name).toBe('Hindi');

    // 3. English Query
    const enResult = detectLanguageAuto('Need a plumber to fix bathroom leak');
    expect(enResult.code).toBe('en-IN');
    expect(enResult.name).toBe('English');

    // 4. Transliterated / Phonetic Kannada
    const knPhonetic = detectLanguageAuto('neeru leak agide sagara dalli plumber beku');
    expect(knPhonetic.code).toBe('kn-IN');
  });

  it('generates localized Kannada response and localized CTA for "ನೀರಿನಲ್ಲಿ.." inquiry', async () => {
    const { generateLocalMultilingualAnswer } = await import('@/lib/gemini');

    const result = generateLocalMultilingualAnswer('ನೀರಿನಲ್ಲಿ..', { city: 'Bengaluru', locality: 'Bengaluru' }, 'kn-IN', 'Kannada');
    expect(result.detectedLanguageCode).toBe('kn-IN');
    expect(result.answer).toContain('ನಮಸ್ಕಾರ');
    expect(result.answer).toContain('ಸೋರಿಕೆ ಮತ್ತು ಪ್ಲಂಬಿಂಗ್');
    expect(result.serviceId).toBe('srv_plumber_general');
    expect(result.serviceNameLocalized).toBe('ಪ್ಲಂಬಿಂಗ್ ಮತ್ತು ಸೋರಿಕೆ ರಿಪೇರಿ ಬುಕ್ ಮಾಡಿ');
    expect(result.estimatedLaborPriceINR).toBeGreaterThan(0);
  });

  it('renders Read aloud controls for speech playback and stop controls', () => {
    const html = renderToString(
      <CustomerAiModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(html).toContain('Read aloud');
    expect(html).toContain('AI Concierge');
  });
});
