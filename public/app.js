/* ----------------------------------------------------
   놀이의발견 AI 광고 플랫폼 프론트엔드 비즈니스 로직
   ---------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  // PPTX 다운로드용 캐싱 변수
  let lastProposalText = '';
  let lastClientName = '';

  // ----------------------------------------------------
  // DOM Elements
  // ----------------------------------------------------
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');
  
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingMessage = document.getElementById('loading-message');
  
  const apiKeyStatus = document.getElementById('api-key-status');
  const keyIndicatorBox = document.getElementById('key-indicator-box');

  // To-Be Flow Steps
  const flowSteps = document.querySelectorAll('.to-be-flow .flow-step.active-step');

  // 1. Tab Navigation Control
  function switchTab(tabId) {
    // 탭 헤더/네비게이션 활성화 변경
    navItems.forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
        // 페이지 제목 및 소제목 변경
        pageTitle.textContent = item.querySelector('span').textContent;
        
        const subTitles = {
          'dashboard-overview': 'AI 기반 광고 유치 및 광고 운영 자동화 시스템 관리',
          'target-segment': '내부 DB 회원 행동 데이터를 기반으로 AI 광고주 매칭',
          'market-research': 'Gemini API 기반 실시간 산업 시장 분석 및 경쟁사 벤치마킹',
          'proposal-generator': '광고 세그먼트 데이터 연계 맞춤형 AI 제안서 자동 생성',
          'roi-analyzer': '집행 광고 성과 피드백 및 CTR / CVR 효율 극대화 액션 플랜 도출',
          'prompt-library': 'AI 광고 업무 자동화에 활용되는 표준 프롬프트 라이브러리 관리'
        };
        pageSubtitle.textContent = subTitles[tabId] || '';
      } else {
        item.classList.remove('active');
      }
    });

    // 탭 콘텐츠 본문 변경
    tabPanes.forEach(pane => {
      if (pane.id === tabId) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // 스크롤 상단 이동
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 모바일 사이드바 요소 제어
  const sidebar = document.querySelector('.sidebar');
  const btnMobileMenu = document.getElementById('btn-mobile-menu');
  const btnMobileClose = document.getElementById('btn-mobile-close');

  if (btnMobileMenu && sidebar) {
    btnMobileMenu.addEventListener('click', () => {
      sidebar.classList.add('show');
    });
  }

  if (btnMobileClose && sidebar) {
    btnMobileClose.addEventListener('click', () => {
      sidebar.classList.remove('show');
    });
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
      
      // 모바일 뷰에서 탭 선택 후 사이드바 닫기
      if (sidebar) sidebar.classList.remove('show');
    });
  });

  // To-Be Flow 클릭 시 해당 탭으로 직접 이동
  flowSteps.forEach(step => {
    step.addEventListener('click', () => {
      const targetTab = step.getAttribute('data-target-tab');
      if (targetTab) {
        switchTab(targetTab);
      }
    });
  });

  // 최종 산출물 10대 기능 테이블의 이동 버튼 클릭 시 탭 이동
  document.querySelectorAll('.btn-nav-to').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.getAttribute('data-target');
      if (targetTab) {
        switchTab(targetTab);
      }
    });
  });

  // ----------------------------------------------------
  // Loading Control
  // ----------------------------------------------------
  function showLoading(message) {
    loadingMessage.textContent = message || 'AI가 보고서를 생성하고 있습니다...';
    loadingOverlay.classList.remove('hidden');
  }

  // 탭 내부 인라인 로딩 (전역 오버레이 대신 사용 — 로딩 중에도 다른 탭 이동/동시 실행 가능)
  function inlineLoadingHTML(message) {
    return `
      <div class="inline-loading">
        <div class="inline-spinner"></div>
        <p>${message || 'AI가 보고서를 생성하고 있습니다...'}</p>
        <div class="inline-progress-track"><div class="inline-progress-fill"></div></div>
      </div>`;
  }

  function setBtnLoading(btn, loading, loadingText) {
    if (!btn) return;
    if (loading) {
      btn.dataset.originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${loadingText || '생성 중...'}`;
    } else {
      btn.disabled = false;
      if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
    }
  }

  // ----------------------------------------------------
  // ROI 퍼널 차트 (광고비 → 예약 건수 → 예약 매출 → ROI)
  // ----------------------------------------------------
  const INDUSTRY_AVG_ROI = 244; // 업종 평균 ROI (%)

  function renderRoiCharts({ conversions, spend, revenue, roas }) {
    const chartArea = document.getElementById('roi-chart-area');
    if (!chartArea) return;

    const convs = Number(conversions) || 0;
    const spnd = Number(spend) || 0;
    const rev = Number(revenue) || 0;
    const roi = parseFloat(roas) || 0;

    const diff = Math.round(roi - INDUSTRY_AVG_ROI);
    const diffUp = diff >= 0;

    const rows = [
      { label: '광고비', value: `${spnd.toLocaleString()}원`, cls: 'fseg-1' },
      { label: '예약 건수', value: `${convs.toLocaleString()}건`, cls: 'fseg-2' },
      { label: '예약 매출', value: `${rev.toLocaleString()}원`, cls: 'fseg-3' },
      { label: 'ROI', value: `${roi}%`, cls: 'fseg-4' }
    ];

    // 퍼널 사다리꼴: 아래로 갈수록 좁아지는 형태 (다음 단 상단 폭 = 현재 단 하단 폭)
    const widths = [100, 87, 74, 61];
    const segsHTML = rows.map((r, i) => {
      const w = widths[i];
      const nextW = widths[i + 1] !== undefined ? widths[i + 1] : w - 13;
      const inset = ((w - nextW) / (2 * w) * 100).toFixed(2);
      return `
        <div class="funnel-seg ${r.cls}" style="width:${w}%; --inset:${inset}%;">
          <span class="funnel-label">${r.label}</span>
          <span class="funnel-value">${r.value}</span>
        </div>`;
    }).join('');

    chartArea.innerHTML = `
      <div class="roi-funnel-card">
        <h4>ROI 퍼널 <small>(이번달)</small></h4>
        <div class="roi-funnel">${segsHTML}</div>
        <div class="roi-benchmark-badge">
          <span>업종 평균 ROI ${INDUSTRY_AVG_ROI}% 대비</span>
          <strong class="${diffUp ? 'diff-up' : 'diff-down'}">${diffUp ? '▲' : '▼'} ${Math.abs(diff)}%p</strong>
        </div>
      </div>`;
    chartArea.classList.remove('hidden');
  }

  function hideLoading() {
    loadingOverlay.classList.add('hidden');
  }

  // ----------------------------------------------------
  // Markdown to Simple HTML Parser Helper
  // ----------------------------------------------------
  function parseMarkdown(mdText) {
    if (!mdText) return '';
    let html = mdText;
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Headings
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    
    // List Items
    html = html.replace(/^\- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    
    // Wrap lists
    // Note: This is simplified. We look for consecutive <li> and wrap them
    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

    // Tables
    const lines = html.split('\n');
    let inTable = false;
    let tableHtml = '';
    let tableLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableLines = [];
        }
        tableLines.push(line);
      } else {
        if (inTable) {
          inTable = false;
          tableHtml = renderMarkdownTable(tableLines);
          // Replace table lines in main text
          const tableStartIndex = i - tableLines.length;
          lines.splice(tableStartIndex, tableLines.length, tableHtml);
          // Adjust iterator since we replaced multiple items with one
          i = tableStartIndex;
        }
      }
    }
    
    if (inTable) {
      tableHtml = renderMarkdownTable(tableLines);
      const tableStartIndex = lines.length - tableLines.length;
      lines.splice(tableStartIndex, tableLines.length, tableHtml);
    }

    html = lines.join('\n');
    
    // Paragraphs (wrap lines that don't have tags)
    html = html.split('\n').map(line => {
      let trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || trimmed.startsWith('<table') || trimmed.startsWith('<div')) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    }).join('\n');

    return html;
  }

  function renderMarkdownTable(lines) {
    let html = '<table><thead>';
    // First line is header
    const headers = lines[0].split('|').map(s => s.trim()).filter(s => s !== '');
    html += '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
    
    // Second line is alignment (skip)
    const startIdx = lines[1] && lines[1].includes('---') ? 2 : 1;
    
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split('|').map(s => s.trim()).filter(s => s !== '');
      if (cols.length > 0) {
        html += '<tr>' + cols.map(c => `<td>${c}</td>`).join('') + '</tr>';
      }
    }
    html += '</tbody></table>';
    return html;
  }

  function createHeroSvgDataUrl(pageNo) {
    const accents = ['FF3B30', 'FF9500', '10B981', '86EFAC', 'FACC15', 'FF3B30', '00F2FE', '4F46E5', 'D97706', '6366F1', 'A7F3D0', 'FBBF24', 'FF3B30'];
    const accent = accents[(pageNo - 1) % accents.length];
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
        <defs>
          <radialGradient id="glow" cx="70%" cy="30%" r="65%">
            <stop offset="0%" stop-color="#${accent}" stop-opacity="0.5"/>
            <stop offset="52%" stop-color="#ffffff" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#0B0D19" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="glass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.62"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.12"/>
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="30" stdDeviation="36" flood-color="#000000" flood-opacity="0.24"/>
          </filter>
          <filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>
        </defs>
        <rect width="1600" height="900" rx="64" fill="#101422"/>
        <rect width="1600" height="900" rx="64" fill="url(#glow)"/>
        <circle cx="1180" cy="210" r="180" fill="#${accent}" opacity="0.28" filter="url(#blur)"/>
        <circle cx="1320" cy="650" r="260" fill="#ffffff" opacity="0.10" filter="url(#blur)"/>
        <g filter="url(#shadow)">
          <rect x="205" y="154" width="970" height="560" rx="54" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.38" stroke-width="2"/>
          <rect x="280" y="230" width="410" height="52" rx="26" fill="#ffffff" opacity="0.28"/>
          <rect x="280" y="322" width="660" height="34" rx="17" fill="#ffffff" opacity="0.18"/>
          <rect x="280" y="380" width="520" height="34" rx="17" fill="#ffffff" opacity="0.13"/>
          <path d="M296 590 C 440 500, 555 612, 704 500 S 995 418, 1098 312" fill="none" stroke="#${accent}" stroke-width="18" stroke-linecap="round" opacity="0.88"/>
          <circle cx="296" cy="590" r="24" fill="#ffffff"/>
          <circle cx="704" cy="500" r="24" fill="#ffffff"/>
          <circle cx="1098" cy="312" r="24" fill="#ffffff"/>
        </g>
        <g opacity="0.86">
          <rect x="1056" y="480" width="260" height="260" rx="50" fill="#ffffff" opacity="0.18"/>
          <rect x="1160" y="322" width="260" height="260" rx="50" fill="#${accent}" opacity="0.5"/>
          <rect x="1222" y="404" width="172" height="172" rx="40" fill="#ffffff" opacity="0.24"/>
        </g>
      </svg>`;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }

  function extractField(section, label) {
    const pattern = new RegExp(`\\* \\*\\*${label}\\*\\*:([^\\n]+)`);
    const match = section.match(pattern);
    return match ? match[1].trim() : '';
  }

  function buildProposalHeroMap(mdText) {
    const map = {};
    const sections = mdText.split(/\n(?=###\s*📄\s*Page\s*\d+)/);
    sections.forEach(section => {
      const pageMatch = section.match(/###\s*📄\s*Page\s*(\d+)/);
      if (!pageMatch) return;
      const pageNo = Number(pageMatch[1]);
      map[pageNo] = {
        description: extractField(section, '⑧ Hero Image 설명'),
        prompt: extractField(section, '⑨ AI 이미지 생성 Prompt \\(영문\\)'),
        negative: extractField(section, '⑩ Negative Prompt'),
        concept: extractField(section, 'Image Concept'),
        ratio: extractField(section, 'Aspect Ratio') || '16:9'
      };
    });
    return map;
  }

  function injectProposalHeroCards(html, mdText) {
    const heroMap = buildProposalHeroMap(mdText);
    return html.replace(/<h3>(.*?)Page\s*(\d+):(.*?)<\/h3>/g, (match, prefix, pageNoText, suffix) => {
      const pageNo = Number(pageNoText);
      const hero = heroMap[pageNo];
      if (!hero) return match;
      return `${match}
        <div class="proposal-hero-card">
          <img src="${createHeroSvgDataUrl(pageNo)}" alt="Page ${pageNo} premium hero visual">
          <div class="proposal-hero-meta">
            <strong>Premium Hero Image</strong>
            <span>${hero.description || hero.concept || 'PPTX/PDF 삽입용 프리미엄 히어로 이미지'}</span>
            <small>Prompt: ${hero.prompt || 'Image prompt will be generated from page context.'}</small>
            <small>Negative: ${hero.negative || 'text, logo, watermark, low quality'} / ${hero.ratio}</small>
          </div>
        </div>`;
    });
  }

  function renderProposalMarkdown(mdText) {
    return injectProposalHeroCards(parseMarkdown(mdText), mdText);
  }

  // ----------------------------------------------------
  // clipboard copy & print helper
  // ----------------------------------------------------
  function setupClipboardAndPrint() {
    const copyBtns = [
      { btnId: 'btn-copy-segment-report', bodyId: 'segment-report-body' },
      { btnId: 'btn-copy-research-report', bodyId: 'research-result-body' },
      { btnId: 'btn-copy-competitor-report', bodyId: 'competitor-result-body' },
      { btnId: 'btn-copy-proposal', bodyId: 'proposal-result-body' },
      { btnId: 'btn-copy-roi-report', bodyId: 'roi-result-body' }
    ];

    copyBtns.forEach(cfg => {
      const btn = document.getElementById(cfg.btnId);
      const body = document.getElementById(cfg.bodyId);
      if (btn && body) {
        btn.addEventListener('click', () => {
          const text = body.innerText;
          navigator.clipboard.writeText(text).then(() => {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> 복사 완료';
            setTimeout(() => btn.innerHTML = originalText, 2000);
          }).catch(err => {
            console.error('Failed to copy text:', err);
          });
        });
      }
    });

    const printBtn = document.getElementById('btn-print-proposal');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        const content = document.getElementById('proposal-result-body').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
          <head>
            <title>광고 제안서 - 놀이의발견</title>
            <style>
              body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
              h1 { font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 10px; }
              h2 { font-size: 18px; margin-top: 30px; }
              h3 { font-size: 15px; }
              p, li { font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { background-color: #f5f5f5; }
              .proposal-hero-card { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; margin: 18px 0 24px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 16px; background: #f8fafc; page-break-inside: avoid; }
              .proposal-hero-card img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 12px; background: #101422; }
              .proposal-hero-meta { display: flex; flex-direction: column; justify-content: center; gap: 8px; min-width: 0; }
              .proposal-hero-meta strong { font-size: 14px; color: #111827; }
              .proposal-hero-meta span { font-size: 12px; color: #374151; }
              .proposal-hero-meta small { font-size: 10px; color: #6b7280; overflow-wrap: anywhere; }
            </style>
          </head>
          <body>
            ${content}
            <script>window.print();<\/script>
          </body>
          </html>
        `);
        printWindow.document.close();
      });
    }
  }
  setupClipboardAndPrint();

  // Check backend server config to indicate if real API key is ready
  async function checkServerStatus() {
    try {
      const res = await fetch('/api/prompts');
      if (res.ok) {
        // If server works, check environmental state
        // In local demo, if real API is set up, it will be online.
        // We'll read the response headers or try to see if .env is populated by checking config indicators.
        // For simplicity, we fallback check
        apiKeyStatus.textContent = 'API Connected';
        keyIndicatorBox.classList.add('active');
      }
    } catch (e) {
      console.warn('Server offline or connection error. Running fully mocked.', e);
      apiKeyStatus.textContent = 'Offline Mode';
    }
  }
  checkServerStatus();

  // ----------------------------------------------------
  // Phase 1: 고객 세그먼트 & 추천 로직
  // ----------------------------------------------------
  const segmentForm = document.getElementById('segment-filter-form');
  const viewCount = document.getElementById('view-segment-count');
  const viewWish = document.getElementById('view-avg-wish');
  const viewCart = document.getElementById('view-avg-cart');
  const viewPurchase = document.getElementById('view-avg-purchase');
  const tableBody = document.querySelector('#table-matched-advertisers tbody');
  const segmentReportArea = document.getElementById('segment-report-area');
  const segmentReportBody = document.getElementById('segment-report-body');

  let currentSegmentData = null; // Store for AI recommendation API

  async function calculateSegment(e) {
    if (e) e.preventDefault();
    
    const filterData = {
      gender: document.getElementById('filter-gender').value,
      age: document.getElementById('filter-age').value,
      location: document.getElementById('filter-location').value,
      period: document.getElementById('filter-period').value,
      favorite: document.getElementById('filter-favorite').value
    };

    try {
      const response = await fetch('/api/mock/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filterData)
      });
      
      const data = await response.json();
      currentSegmentData = {
        filter: filterData,
        metrics: data.metrics,
        matched: data.matchedAdvertisers
      };

      // UI 업데이트
      viewCount.textContent = `${data.segmentCount.toLocaleString()}명`;
      viewWish.textContent = `${data.metrics.avgWish}회`;
      viewCart.textContent = `${data.metrics.avgCart}회`;
      viewPurchase.textContent = `${data.metrics.avgPurchase}회`;

      // 테이블 렌더링
      tableBody.innerHTML = '';
      if (data.matchedAdvertisers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">조건에 매칭되는 광고 대상 브랜드가 없습니다.</td></tr>`;
      } else {
        data.matchedAdvertisers.forEach(adv => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${adv.name}</strong></td>
            <td>${adv.category}</td>
            <td>${adv.region}</td>
            <td><span class="badge">${adv.adHistory}</span></td>
            <td><span class="fit-badge">${adv.fitScore}점</span></td>
            <td>
              <button class="btn btn-primary btn-sm btn-action-recommend" data-name="${adv.name}">
                <i class="fa-solid fa-robot"></i> 제안서 기획
              </button>
            </td>
          `;
          tableBody.appendChild(tr);
        });

        // 테이블 내 액션 이벤트 바인딩 (맞춤 제안서 탭으로 바로 파라미터 전달)
        document.querySelectorAll('.btn-action-recommend').forEach(btn => {
          btn.addEventListener('click', (ev) => {
            const name = ev.currentTarget.getAttribute('data-name');
            // 제안서 탭의 인풋창 세팅
            document.getElementById('proposal-client-name').value = name;
            document.getElementById('proposal-target-segment').value = 
              `${filterData.age} ${filterData.location} 가족고객 (선호: ${filterData.favorite})`;
            switchTab('proposal-generator');
          });
        });
      }

      // 자동으로 세그먼트 추천 리포트 호출
      requestSegmentAIAnalysis();

    } catch (err) {
      console.error('Error fetching segments:', err);
    }
  }

  // AI 심층 분석 의견 생성 요청
  async function requestSegmentAIAnalysis() {
    if (!currentSegmentData) return;
    segmentReportArea.classList.remove('hidden');
    segmentReportBody.innerHTML = `
      <div class="placeholder-text" style="height: 100px;">
        <i class="fa-solid fa-spinner fa-spin text-teal"></i>
        <p>AI가 해당 세그먼트 데이터의 최적화 캠페인 적합도를 분석하는 중입니다...</p>
      </div>
    `;

    try {
      const res = await fetch('/api/ai/recommend-advertiser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentInfo: {
            gender: currentSegmentData.filter.gender,
            age: currentSegmentData.filter.age,
            location: currentSegmentData.filter.location,
            period: currentSegmentData.filter.period,
            favorite: currentSegmentData.filter.favorite,
            avgWish: currentSegmentData.metrics.avgWish,
            avgCart: currentSegmentData.metrics.avgCart,
            avgPurchase: currentSegmentData.metrics.avgPurchase
          },
          matchedAdvertisers: currentSegmentData.matched
        })
      });
      const data = await res.json();
      if (data.success) {
        segmentReportBody.innerHTML = parseMarkdown(data.report);
      } else {
        segmentReportBody.innerHTML = `<p class="warning-text">AI 분석 도중 에러가 발생했습니다: ${data.error}</p>`;
      }
    } catch (e) {
      segmentReportBody.innerHTML = `<p class="warning-text">서버 연결에 실패했습니다.</p>`;
    }
  }

  if (segmentForm) {
    segmentForm.addEventListener('submit', calculateSegment);
    // 초기 세그먼트 계산
    calculateSegment();
  }

  // ----------------------------------------------------
  // Phase 2: 시장조사 & 경쟁사 분석 로직
  // ----------------------------------------------------
  const btnResearch = document.getElementById('btn-run-research');
  const btnCompetitor = document.getElementById('btn-run-competitor');
  const researchResultArea = document.getElementById('research-result-area');
  const researchResultBody = document.getElementById('research-result-body');
  const researchResultTitle = document.getElementById('research-result-title');
  const competitorResultArea = document.getElementById('competitor-result-area');
  const competitorResultBody = document.getElementById('competitor-result-body');
  const competitorResultTitle = document.getElementById('competitor-result-title');

  if (btnResearch) {
    btnResearch.addEventListener('click', async () => {
      const industry = document.getElementById('research-industry').value;
      if (!industry.trim()) return alert('산업 업종을 입력해 주세요.');

      // 결과 카드를 먼저 열고 그 안에서 인라인 로딩 표시 (다른 탭 이동/경쟁사 분석 동시 실행 가능)
      researchResultTitle.innerHTML = `<i class="fa-solid fa-magnifying-glass-chart text-teal"></i> [시장조사] ${industry} 분야 AI 분석 리포트`;
      researchResultBody.innerHTML = inlineLoadingHTML('AI가 국내 여가 시장 조사 및 트렌드 보고서를 집필 중입니다...');
      researchResultArea.classList.remove('hidden');
      researchResultArea.scrollIntoView({ behavior: 'smooth' });
      setBtnLoading(btnResearch, true, 'AI 시장조사 실행 중...');

      try {
        const res = await fetch('/api/ai/market-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ industry })
        });
        const data = await res.json();
        if (data.success) {
          researchResultBody.innerHTML = parseMarkdown(data.report);
        } else {
          researchResultBody.innerHTML = `<p class="warning-text">시장조사 리포트 생성 중 오류가 발생했습니다.</p>`;
        }
      } catch (e) {
        researchResultBody.innerHTML = `<p class="warning-text">시장조사 수행 실패: 서버 연결 상태를 확인해 주세요.</p>`;
      } finally {
        setBtnLoading(btnResearch, false);
      }
    });
  }

  if (btnCompetitor) {
    btnCompetitor.addEventListener('click', async () => {
      const competitors = document.getElementById('competitor-list').value;
      if (!competitors.trim()) return alert('경쟁사 리스트를 입력해 주세요.');

      // 결과 카드를 먼저 열고 그 안에서 인라인 로딩 표시 (다른 탭 이동/시장조사 동시 실행 가능)
      competitorResultTitle.innerHTML = `<i class="fa-solid fa-compress text-purple"></i> [경쟁사 분석] ${competitors} 비교 벤치마킹표`;
      competitorResultBody.innerHTML = inlineLoadingHTML('AI가 경쟁 서비스의 광고 상품 구성을 정밀 비교 분석하고 있습니다...');
      competitorResultArea.classList.remove('hidden');
      competitorResultArea.scrollIntoView({ behavior: 'smooth' });
      setBtnLoading(btnCompetitor, true, 'AI 경쟁사 분석 중...');

      try {
        const res = await fetch('/api/ai/competitor-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ competitors })
        });
        const data = await res.json();
        if (data.success) {
          competitorResultBody.innerHTML = parseMarkdown(data.report);
        } else {
          competitorResultBody.innerHTML = `<p class="warning-text">경쟁사 분석 리포트 생성 중 오류가 발생했습니다.</p>`;
        }
      } catch (e) {
        competitorResultBody.innerHTML = `<p class="warning-text">경쟁사 분석 실패: 서버 연결 상태를 확인해 주세요.</p>`;
      } finally {
        setBtnLoading(btnCompetitor, false);
      }
    });
  }

  // ----------------------------------------------------
  // Phase 3: 맞춤 광고 제안서 생성 로직
  // ----------------------------------------------------
  const btnProposal = document.getElementById('btn-generate-proposal');
  const proposalBody = document.getElementById('proposal-result-body');

  if (btnProposal) {
    btnProposal.addEventListener('click', async () => {
      const clientName = document.getElementById('proposal-client-name').value;
      if (!clientName.trim()) return alert('제안서 대상 업체명을 입력해 주세요.');

      // 인라인 로딩: 생성 중에도 다른 탭 이동 가능
      proposalBody.innerHTML = inlineLoadingHTML(`${clientName} 파트너사 맞춤형 AI 광고 기획 제안서를 생성 중입니다...`);
      setBtnLoading(btnProposal, true, 'AI 제안서 생성 중...');

      try {
        const res = await fetch('/api/ai/proposal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientName })
        });
        const data = await res.json();
        if (data.success) {
          proposalBody.innerHTML = renderProposalMarkdown(data.report);
          // PPTX 다운로드 버튼 노출 및 캐싱
          const pptBtn = document.getElementById('btn-download-pptx');
          if (pptBtn) pptBtn.style.display = 'inline-block';
          lastProposalText = data.report;
          lastClientName = clientName;
        } else {
          proposalBody.innerHTML = `<p class="warning-text">제안서 작성 중 에러가 발생했습니다.</p>`;
        }
      } catch (e) {
        proposalBody.innerHTML = `<p class="warning-text">서버 연결 실패.</p>`;
      } finally {
        setBtnLoading(btnProposal, false);
      }
    });
  }

  // ----------------------------------------------------
  // Phase 4: AI ROI 및 성과 피드백 로직
  // ----------------------------------------------------
  const partnerSelect = document.getElementById('roi-partner-select');
  const inputImps = document.getElementById('roi-input-impressions');
  const inputClicks = document.getElementById('roi-input-clicks');
  const inputConvs = document.getElementById('roi-input-conversions');
  const inputSpend = document.getElementById('roi-input-spend');
  const inputRevenue = document.getElementById('roi-input-revenue');
  const btnRunRoi = document.getElementById('btn-run-roi-analysis');
  
  const viewCtr = document.getElementById('roi-calc-ctr');
  const viewCvr = document.getElementById('roi-calc-cvr');
  const viewRoas = document.getElementById('roi-calc-roas');
  const viewContribution = document.getElementById('roi-calc-contribution');
  const viewRenewal = document.getElementById('roi-calc-renewal');
  const roiReportBody = document.getElementById('roi-result-body');

  let localPerformances = [];

  // 가상 파트너 광고 이력 데이터 로드
  async function loadPerformanceData() {
    try {
      const res = await fetch('/api/mock/performances');
      localPerformances = await res.json();
      
      partnerSelect.innerHTML = '';
      localPerformances.forEach(perf => {
        const opt = document.createElement('option');
        opt.value = perf.id;
        opt.textContent = `${perf.partnerName} (${perf.period})`;
        partnerSelect.appendChild(opt);
      });

      // 수동 선택 변경 시 인풋 데이터 바인딩
      partnerSelect.addEventListener('change', (e) => {
        const selected = localPerformances.find(p => p.id === e.target.value);
        if (selected) {
          inputImps.value = selected.impressions;
          inputClicks.value = selected.clicks;
          inputConvs.value = selected.conversions;
          inputSpend.value = selected.spend;
          inputRevenue.value = selected.revenue;
        }
      });

      // 초기 세팅값 바인딩
      if (localPerformances.length > 0) {
        partnerSelect.dispatchEvent(new Event('change'));
      }

    } catch (e) {
      console.warn('Failed to load performance data from backend.', e);
    }
  }
  loadPerformanceData();

  if (btnRunRoi) {
    btnRunRoi.addEventListener('click', async () => {
      const partnerName = partnerSelect.options[partnerSelect.selectedIndex]?.text.split(' ')[0] || '선택업체';
      const sendData = {
        partnerName,
        impressions: inputImps.value,
        clicks: inputClicks.value,
        conversions: inputConvs.value,
        spend: inputSpend.value,
        revenue: inputRevenue.value
      };

      // 인라인 로딩: 분석 중에도 다른 탭 이동 가능
      roiReportBody.innerHTML = inlineLoadingHTML('AI가 광고 효율 데이터를 계산하고 개선 피드백을 수립 중입니다...');
      setBtnLoading(btnRunRoi, true, 'AI 성과 분석 중...');

      try {
        const res = await fetch('/api/ai/roi-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sendData)
        });
        const data = await res.json();
        if (data.success) {
          // 계산 지표 표시
          viewCtr.textContent = `${data.calculated.ctr}%`;
          viewCvr.textContent = `${data.calculated.cvr}%`;
          viewRoas.textContent = `${data.calculated.roas}%`;
          if (viewContribution) viewContribution.textContent = `${data.calculated.contributionMargin}%`;
          if (viewRenewal) viewRenewal.textContent = `${data.calculated.renewalScore}점`;

          // ROI 퍼널 차트 렌더링
          renderRoiCharts({
            conversions: sendData.conversions,
            spend: sendData.spend,
            revenue: sendData.revenue,
            roas: data.calculated.roas
          });

          roiReportBody.innerHTML = parseMarkdown(data.report);
        } else {
          roiReportBody.innerHTML = `<p class="warning-text">ROI 리포트 작성 도중 오류 발생</p>`;
        }
      } catch (e) {
        roiReportBody.innerHTML = `<p class="warning-text">서버 통신 실패.</p>`;
      } finally {
        setBtnLoading(btnRunRoi, false);
      }
    });
  }

  // ----------------------------------------------------
  // 프롬프트 라이브러리 렌더링
  // ----------------------------------------------------
  const promptContainer = document.getElementById('prompt-templates-container');

  async function loadPrompts() {
    try {
      const res = await fetch('/api/prompts');
      const prompts = await res.json();
      
      promptContainer.innerHTML = '';
      for (const [key, details] of Object.entries(prompts)) {
        const card = document.createElement('div');
        card.className = 'prompt-template-card';
        card.innerHTML = `
          <h4>
            <span><i class="fa-solid fa-code text-teal"></i> ${details.title}</span>
            <span class="header-badge" style="margin-left:0;">System Prompt</span>
          </h4>
          <textarea readonly>${details.template}</textarea>
        `;
        promptContainer.appendChild(card);
      }
    } catch (e) {
      console.warn('Failed to load prompts.', e);
    }
  }
  loadPrompts();

  // ----------------------------------------------------
  // AI 원클릭 통합 마스터 엔진 비즈니스 로직
  // ----------------------------------------------------
  const unifiedInput = document.getElementById('unified-prompt-input');
  const btnRunUnified = document.getElementById('btn-run-unified-engine');
  const unifiedStatusBadge = document.getElementById('unified-status-badge');
  const quickPromptBtns = document.querySelectorAll('.quick-prompt-btn');

  // 1. 아코디언 토글 기능
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const wasActive = item.classList.contains('active');
      
      // 다른 아코디언 아이템 다 닫기
      document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
      
      if (!wasActive) {
        item.classList.add('active');
      }
    });
  });

  // 2. 예시 프롬프트 퀵 태그 버튼 이벤트
  quickPromptBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      quickPromptBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      unifiedInput.value = btn.getAttribute('data-prompt');
    });
  });

  // 3. 통합 마스터 엔진 가동 리스너
  if (btnRunUnified) {
    btnRunUnified.addEventListener('click', async () => {
      const promptValue = unifiedInput.value.trim();
      if (!promptValue) return alert('프롬프트 내용을 입력해 주세요.');

      // 초기 UI 리셋
      unifiedStatusBadge.textContent = '생성 중 (Gemini)...';
      unifiedStatusBadge.style.background = 'rgba(189, 0, 255, 0.15)';
      unifiedStatusBadge.style.color = 'var(--neon-purple)';
      
      document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.remove('completed', 'active');
      });
      document.querySelectorAll('.outcome-item').forEach(item => {
        item.classList.remove('active');
        item.querySelector('.roadmap-status').innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
      });

      // UI 순차 애니메이션 시뮬레이션용 헬퍼
      const setItemRunning = (id) => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('active');
          el.querySelector('.accordion-header .icon').innerHTML = '<i class="fa-solid fa-spinner fa-spin text-teal"></i>';
        }
      };

      const setItemComplete = (id, htmlContent) => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.remove('active');
          el.classList.add('completed');
          el.querySelector('.accordion-header .icon').innerHTML = '<i class="fa-solid fa-circle-check"></i>';
          el.querySelector('.accordion-content').innerHTML = htmlContent;
        }
      };

      // 7대 비즈니스 효과 활성화 헬퍼
      const activateOutcome = (id) => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.add('active');
          el.querySelector('.roadmap-status').innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        }
      };

      try {
        // Agent-to-Agent 컨텍스트 체인: 선행 에이전트의 산출물을 후행 에이전트 프롬프트에 전달
        const agentOutputs = [];
        const chainContext = () => agentOutputs
          .map((o) => `[선행 Agent: ${o.name}]\n${(o.report || '').slice(0, 2500)}`)
          .join('\n\n');

        // [산출물 1, 5] 세그먼트 & 상품 추천
        setItemRunning('deliv-1');
        setItemRunning('deliv-5');
        const segRes = await fetch('/api/mock/segments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gender: '여성', age: '30대', location: '경기', period: '1년이상', favorite: '키즈카페' })
        });
        const segData = await segRes.json();
        
        const recReportRes = await fetch('/api/ai/recommend-advertiser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segmentInfo: { 
              gender: '여성', 
              age: '30대', 
              location: '경기', 
              period: '1년이상', 
              favorite: '키즈카페', 
              avgWish: segData.metrics.avgWish, 
              avgCart: segData.metrics.avgCart,
              avgPurchase: segData.metrics.avgPurchase
            },
            matchedAdvertisers: segData.matchedAdvertisers
          })
        });
        const recReportData = await recReportRes.json();
        agentOutputs.push({ name: 'AI 광고주 추천', report: recReportData.report });

        // [크로스탭 반영] 고객 세그먼트 & 추천 탭에도 결과 적용
        const segmentReportArea = document.getElementById('segment-report-area');
        const segmentReportBody = document.getElementById('segment-report-body');
        if (segmentReportArea && segmentReportBody) {
          segmentReportBody.innerHTML = parseMarkdown(recReportData.report);
          segmentReportArea.classList.remove('hidden');
        }

        setItemComplete('deliv-1', parseMarkdown(recReportData.report));
        setItemComplete('deliv-5', `
          <h3>🎯 AI 맞춤 광고 상품 매칭</h3>
          <p>분석된 <strong>3040 경기권 여성 고관여 패밀리 세그먼트</strong>에 적합한 최적 광고 인벤토리 포트폴리오입니다.</p>
          <table>
            <thead>
              <tr>
                <th>추천 지면</th>
                <th>노출 방식</th>
                <th>추천 매칭 강도</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Plan A: 개인화 App Push</strong></td>
                <td>최근 찜/장바구니 7일 내 미결제 회원 대상 타겟팅 발송</td>
                <td>🌟🌟🌟🌟🌟 (최상)</td>
              </tr>
              <tr>
                <td><strong>Plan B: 홈화면 롤링 배너</strong></td>
                <td>앱 메인 접속 시 연령/지역 타겟 배너 롤링 노출</td>
                <td>🌟🌟🌟🌟 (우수)</td>
              </tr>
              <tr>
                <td><strong>Plan C: 테마 특가 기획전</strong></td>
                <td>'키즈카페 단독 특가 패키지' 기획전 참여</td>
                <td>🌟🌟🌟🌟 (우수)</td>
              </tr>
            </tbody>
          </table>
        `);
        activateOutcome('out-1');
        activateOutcome('out-2');

        // [산출물 2, 3] 시장조사 & 경쟁사 분석
        setItemRunning('deliv-2');
        setItemRunning('deliv-3');
        const marketRes = await fetch('/api/ai/market-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ industry: '가족 키즈카페 및 여가 액티비티', previousContext: chainContext() })
        });
        const marketData = await marketRes.json();
        agentOutputs.push({ name: 'AI 시장조사', report: marketData.report });
        setItemComplete('deliv-2', parseMarkdown(marketData.report));

        // [크로스탭 반영] 시장조사 & 경쟁사 분석 탭에도 결과 적용
        if (researchResultArea && researchResultBody) {
          researchResultTitle.innerHTML = `<i class="fa-solid fa-magnifying-glass-chart text-teal"></i> [시장조사] 가족 키즈카페 및 여가 액티비티 분야 AI 분석 리포트`;
          researchResultBody.innerHTML = parseMarkdown(marketData.report);
          researchResultArea.classList.remove('hidden');
        }

        const compRes = await fetch('/api/ai/competitor-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ competitors: '한화리조트, 에버랜드, 네이버 플레이스', previousContext: chainContext() })
        });
        const compData = await compRes.json();
        agentOutputs.push({ name: 'AI 경쟁사 분석', report: compData.report });
        setItemComplete('deliv-3', parseMarkdown(compData.report));

        // [크로스탭 반영] 경쟁사 분석 결과 카드에도 적용
        if (competitorResultArea && competitorResultBody) {
          competitorResultTitle.innerHTML = `<i class="fa-solid fa-compress text-purple"></i> [경쟁사 분석] 한화리조트, 에버랜드, 네이버 플레이스 비교 벤치마킹표`;
          competitorResultBody.innerHTML = parseMarkdown(compData.report);
          competitorResultArea.classList.remove('hidden');
        }
        activateOutcome('out-3');
        activateOutcome('out-4');

        // [산출물 4] 맞춤 광고 제안서 생성
        setItemRunning('deliv-4');
        const propRes = await fetch('/api/ai/proposal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientName: '풀무원 키즈랜드', previousContext: chainContext() })
        });
        const propData = await propRes.json();
        agentOutputs.push({ name: 'AI 맞춤형 광고 제안서', report: propData.report });
        setItemComplete('deliv-4', parseMarkdown(propData.report));
        
        // 아코디언 내 proposal 마크다운 대상 영역 채우기 & PPTX 노출
        const deliv4 = document.getElementById('deliv-4');
        if (deliv4) {
          const mdTarget = deliv4.querySelector('.proposal-markdown-target');
          if (mdTarget) mdTarget.innerHTML = renderProposalMarkdown(propData.report);
          const wrapper = document.getElementById('acc-pptx-wrapper');
          if (wrapper) wrapper.style.display = 'block';
        }
        lastProposalText = propData.report;
        lastClientName = '풀무원';

        // [크로스탭 반영] 맞춤 제안서 생성 탭에도 결과 적용 + PPTX 버튼 노출
        if (proposalBody) {
          proposalBody.innerHTML = renderProposalMarkdown(propData.report);
          const pptBtnTab = document.getElementById('btn-download-pptx');
          if (pptBtnTab) pptBtnTab.style.display = 'inline-block';
          const clientNameInput = document.getElementById('proposal-client-name');
          if (clientNameInput) clientNameInput.value = '풀무원 키즈랜드';
        }

        // [산출물 6, 7, 8] 성과 분석, ROI, 재계약 및 업셀링
        setItemRunning('deliv-6');
        setItemRunning('deliv-7');
        setItemRunning('deliv-8');
        const roiRes = await fetch('/api/ai/roi-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partnerName: '뽀로로 파크',
            impressions: 120000,
            clicks: 3600,
            conversions: 450,
            spend: 1500000,
            revenue: 4500000,
            previousContext: chainContext()
          })
        });
        const roiData = await roiRes.json();
        
        setItemComplete('deliv-6', `
          <h3>📊 AI 광고 캠페인 효율 진단 통계</h3>
          <p>최근 캠페인 집행 결과를 기반으로 AI 엔진이 도출한 효율 등급입니다.</p>
          <table>
            <thead>
              <tr>
                <th>평가 항목</th>
                <th>성과 수치</th>
                <th>업계 평균</th>
                <th>AI 효율 판정</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>클릭률 (CTR)</strong></td>
                <td>${roiData.calculated.ctr}%</td>
                <td>2.0%</td>
                <td><span class="text-green" style="font-weight:600;">Excellent (평균 이상)</span></td>
              </tr>
              <tr>
                <td><strong>구매 전환율 (CVR)</strong></td>
                <td>${roiData.calculated.cvr}%</td>
                <td>5.0%</td>
                <td><span class="text-teal" style="font-weight:600;">Normal (보통)</span></td>
              </tr>
              <tr>
                <td><strong>광고비 매출수익률 (ROAS)</strong></td>
                <td>${roiData.calculated.roas}%</td>
                <td>250%</td>
                <td><span class="text-green" style="font-weight:600;">Superb (최우수 달성)</span></td>
              </tr>
            </tbody>
          </table>
        `);
        setItemComplete('deliv-7', parseMarkdown(roiData.report));

        // [크로스탭 반영] 성과 분석 & ROI 리포트 탭에도 지표/차트/리포트 적용
        if (roiReportBody) {
          viewCtr.textContent = `${roiData.calculated.ctr}%`;
          viewCvr.textContent = `${roiData.calculated.cvr}%`;
          viewRoas.textContent = `${roiData.calculated.roas}%`;
          if (viewContribution) viewContribution.textContent = `${roiData.calculated.contributionMargin}%`;
          if (viewRenewal) viewRenewal.textContent = `${roiData.calculated.renewalScore}점`;
          renderRoiCharts({
            conversions: 450,
            spend: 1500000,
            revenue: 4500000,
            roas: roiData.calculated.roas
          });
          roiReportBody.innerHTML = parseMarkdown(roiData.report);
        }
        setItemComplete('deliv-8', `
          <h3>💡 AI 재계약/업셀링 전략 처방안</h3>
          <ul>
            <li><strong>상위 등급 패키지 제안</strong>: ROAS ${roiData.calculated.roas}%가 증명되었으므로 기존 단일 푸시 지면에서 홈 롤잉배너가 결합된 패키지로 롤오버 계약 유도 권장.</li>
            <li><strong>할인 프로모션 조합</strong>: 단일 상품 대신 '가족 여가 체험 기획전' 참여를 제안하여 신규 예산 업셀링 확보.</li>
          </ul>
        `);
        activateOutcome('out-5');
        activateOutcome('out-6');

        // [산출물 9, 10] Prompt Library & Agent 지원
        setItemRunning('deliv-9');
        setItemRunning('deliv-10');
        
        const promptsRes = await fetch('/api/prompts');
        const promptsData = await promptsRes.json();
        
        setItemComplete('deliv-9', `
          <h3>📖 시스템 라이브러리 검증 완료</h3>
          <p>플랫폼 내에서 안전한 API Proxy 호출 시 결합되는 표준화된 Prompt Templates 5건이 시스템 DB에 안착해 있습니다.</p>
          <ul>
            <li><strong>시장조사 템플릿</strong>: <code>${promptsData.research.title}</code></li>
            <li><strong>경쟁사비교 템플릿</strong>: <code>${promptsData.competitor.title}</code></li>
            <li><strong>광고제안서 템플릿</strong>: <code>${promptsData.proposal.title}</code></li>
          </ul>
        `);
        setItemComplete('deliv-10', `
          <h3>🤖 AI Agent 기반 상시 광고 운영 어시스턴트</h3>
          <p>AI 에이전트 모듈이 활성화되어 백엔드에서 사용자 질문(프롬프트)에 대한 파싱 및 프롬프트 인젝션을 완벽하게 감시 및 지원하고 있습니다.</p>
        `);
        activateOutcome('out-7');

        // 전체 최종 완료 UI 세팅
        unifiedStatusBadge.textContent = '일괄 생성 완료';
        unifiedStatusBadge.style.background = 'rgba(57, 255, 20, 0.15)';
        unifiedStatusBadge.style.color = 'var(--neon-green)';
        
        // 1번(광고주 추천) 아코디언 기본 활성화해서 결과 보여주기
        const firstItem = document.getElementById('deliv-1');
        if (firstItem) firstItem.classList.add('active');

      } catch (err) {
        console.error('Unified engine execution failed:', err);
        unifiedStatusBadge.textContent = '생성 실패';
        unifiedStatusBadge.style.background = 'rgba(255, 0, 127, 0.15)';
        unifiedStatusBadge.style.color = 'var(--neon-pink)';
        alert('AI 엔진 연동 중 에러가 발생했습니다. API Key 상태를 확인하세요.');
      }
    });
  }

  // ----------------------------------------------------
  // PPTX 제안서 다운로드 공통 기능
  // ----------------------------------------------------
  async function downloadPPTX(e) {
    if (!lastProposalText) return alert('생성된 제안서가 없습니다. 먼저 AI 제안서를 생성해 주세요.');

    // 클릭된 버튼에 인라인 로딩 표시 (전역 오버레이 없이 다른 탭 이동 가능)
    const clickedBtn = e && e.currentTarget ? e.currentTarget : null;
    setBtnLoading(clickedBtn, true, 'PPTX 생성 중...');

    try {
      const res = await fetch('/api/ai/proposal/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: lastClientName || '광고주',
          proposalText: lastProposalText
        })
      });

      if (!res.ok) throw new Error('PPTX 생성 API 실패');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposal_${lastClientName || 'advertiser'}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PPTX 다운로드 오류:', e);
      alert('PPTX 제안서 파일 생성 및 다운로드 도중 에러가 발생했습니다.');
    } finally {
      setBtnLoading(clickedBtn, false);
    }
  }

  const btnDownloadPptx = document.getElementById('btn-download-pptx');
  const btnAccDownloadPptx = document.getElementById('btn-acc-download-pptx');

  if (btnDownloadPptx) btnDownloadPptx.addEventListener('click', downloadPPTX);
  if (btnAccDownloadPptx) btnAccDownloadPptx.addEventListener('click', downloadPPTX);

  // ----------------------------------------------------
  // Ver 1.0 / Ver 2.0 토글 (사이드바 로고 우측)
  // ----------------------------------------------------
  const versionToggle = document.getElementById('version-toggle');
  const ver2Placeholder = document.getElementById('ver2-placeholder');
  const tabContentContainer = document.querySelector('.tab-content-container');

  function switchVersion(ver) {
    if (!versionToggle || !ver2Placeholder || !tabContentContainer) return;
    versionToggle.querySelectorAll('.ver-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.ver === ver);
    });

    const isV2 = ver === '2';
    tabContentContainer.classList.toggle('hidden', isV2);
    ver2Placeholder.classList.toggle('hidden', !isV2);
    // Ver 2.0 모드: 사이드바 메뉴/푸터/헤더 숨김 처리용 클래스
    document.body.classList.toggle('ver2-mode', isV2);

    if (isV2) {
      pageTitle.textContent = 'Ver 2.0 (준비 중)';
      pageSubtitle.textContent = '차세대 AI 광고 플랫폼 업그레이드 버전을 준비하고 있습니다';
    } else {
      // 현재 활성 탭 기준으로 제목/화면 복원
      const activeNav = document.querySelector('.nav-item.active');
      if (activeNav) switchTab(activeNav.getAttribute('data-tab'));
    }
  }

  if (versionToggle) {
    versionToggle.querySelectorAll('.ver-btn').forEach(btn => {
      btn.addEventListener('click', () => switchVersion(btn.dataset.ver));
    });

    // Ver 2.0 상태에서 사이드바 메뉴 클릭 시 자동으로 Ver 1.0 화면 복귀
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const v2Active = versionToggle.querySelector('.ver-btn[data-ver="2"]').classList.contains('active');
        if (v2Active) switchVersion('1');
      });
    });
  }

});
