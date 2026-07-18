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
        if (tabId === 'target-segment') {
          pageTitle.innerHTML = '<i class="fa-solid fa-robot text-blue" style="margin-right: 8px; color: var(--neon-blue);"></i>AI광고주 센터 <span class="badge" style="font-size: 10px; padding: 2px 6px; background: rgba(0, 242, 254, 0.15); color: var(--neon-blue); border: 1px solid rgba(0, 242, 254, 0.3); border-radius: 4px; margin-left: 6px; vertical-align: middle; font-weight: bold; text-shadow: 0 0 5px rgba(0,242,254,0.3);">BETA</span>';
        } else {
          pageTitle.textContent = item.querySelector('span').textContent;
        }
        
        const subTitles = {
          'dashboard-overview': 'AI 기반 광고 유치 및 광고 운영 자동화 시스템 관리',
          'target-segment': '최근 크롤링 기반 이슈 광고주 데이터 분석 및 매칭',
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

    // 대시보드 탭 로드 시 데이터 로딩 및 차트 갱신
    if (tabId === 'dashboard-overview') {
      loadDashboardData();
    }

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
  // Phase 1: AI광고주 센터 로직
  // ----------------------------------------------------
  const advertiserForm = document.getElementById('advertiser-filter-form');
  const summaryTotal = document.getElementById('summary-total-analyzed');
  const summaryIssue = document.getElementById('summary-issue-count');
  const summaryAvg = document.getElementById('summary-avg-score');
  const summaryMax = document.getElementById('summary-max-score');
  const tableBody = document.querySelector('#table-issue-advertisers tbody');
  
  // Toggle buttons logic for Gender
  const genderGroup = document.getElementById('filter-gender-group');
  const genderInput = document.getElementById('filter-gender');
  if (genderGroup && genderInput) {
    genderGroup.querySelectorAll('.btn-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        genderGroup.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        genderInput.value = btn.dataset.value;
      });
    });
  }

  // Toggle buttons logic for Period
  const periodGroup = document.getElementById('filter-period-group');
  const periodInput = document.getElementById('filter-period');
  if (periodGroup && periodInput) {
    periodGroup.querySelectorAll('.btn-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        periodGroup.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        periodInput.value = btn.dataset.value;
      });
    });
  }

  // Dual-slider input logic
  const scoreMinInput = document.getElementById('filter-score-min');
  const scoreMaxInput = document.getElementById('filter-score-max');
  const scoreRangeLabel = document.getElementById('view-score-range-label');

  function updateScoreSliderTrack() {
    let minVal = parseInt(scoreMinInput.value);
    let maxVal = parseInt(scoreMaxInput.value);
    
    if (minVal > maxVal) {
      const tmp = minVal;
      minVal = maxVal;
      maxVal = tmp;
      scoreMinInput.value = minVal;
      scoreMaxInput.value = maxVal;
    }
    
    if (scoreRangeLabel) {
      scoreRangeLabel.textContent = minVal + ' - ' + maxVal;
    }
    
    const track = document.querySelector('.range-slider-track');
    if (track) {
      track.style.background = `linear-gradient(to right, rgba(255,255,255,0.1) ${minVal}%, var(--neon-blue) ${minVal}%, var(--neon-blue) ${maxVal}%, rgba(255,255,255,0.1) ${maxVal}%)`;
    }
  }

  if (scoreMinInput && scoreMaxInput) {
    scoreMinInput.addEventListener('input', updateScoreSliderTrack);
    scoreMaxInput.addEventListener('input', updateScoreSliderTrack);
    updateScoreSliderTrack();
  }

  // Pagination state
  let currentPage = 1;
  let pageSize = 10;
  let allAdvertisers = [];

  // Donut chart reference
  let distributionChart = null;

  function renderDistributionChart(dataDist) {
    const canvas = document.getElementById('chart-issue-score-distribution');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (distributionChart) {
      distributionChart.destroy();
    }
    
    distributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['80점 이상', '60 ~ 79점', '40 ~ 59점', '20 ~ 39점', '20점 미만'],
        datasets: [{
          data: dataDist,
          backgroundColor: ['#00f2fe', '#3b82f6', '#a855f7', '#ff9f1c', '#626880'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        cutout: '65%'
      }
    });
  }

  function renderTablePage(page) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    if (allAdvertisers.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">조건에 매칭되는 광고주 데이터가 없습니다.</td></tr>`;
      document.getElementById('pagination-info-text').textContent = '전체 0건 중 0-0 표시';
      return;
    }
    
    const startIdx = (page - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, allAdvertisers.length);
    const visibleData = allAdvertisers.slice(startIdx, endIdx);
    
    visibleData.forEach((adv, idx) => {
      const tr = document.createElement('tr');
      
      let rankClass = 'rank-other';
      if (adv.rank === 1) rankClass = 'rank-1';
      else if (adv.rank === 2) rankClass = 'rank-2';
      else if (adv.rank === 3) rankClass = 'rank-3';
      
      const rankBadge = `<span class="rank-badge ${rankClass}">${adv.rank}</span>`;
      
      tr.innerHTML = `
        <td style="text-align:center; vertical-align:middle;">${rankBadge}</td>
        <td style="vertical-align:middle;"><strong>${adv.name}</strong></td>
        <td style="vertical-align:middle;"><i class="fa-solid fa-utensils text-muted" style="margin-right:6px;"></i>${adv.category}</td>
        <td style="vertical-align:middle;">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <span style="font-weight:700; color:#fff; font-size:11px;">${adv.score}점</span>
            <div style="background:rgba(255,255,255,0.05); border-radius:4px; height:6px; width:100%; overflow:hidden; border:1px solid rgba(255,255,255,0.05);">
              <div style="background:linear-gradient(90deg, #3b82f6, var(--neon-blue)); width:${adv.score}%; height:100%; border-radius:4px;"></div>
            </div>
          </div>
        </td>
        <td style="font-size:11px; color:var(--text-secondary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align:middle;">${adv.keywords}</td>
        <td style="font-size:10px; color:var(--text-muted); vertical-align:middle;">${adv.period}</td>
        <td style="text-align:center; vertical-align:middle;">
          <button class="btn btn-primary btn-sm btn-analyze-brand" data-name="${adv.name}" style="padding: 4px 10px; font-size:11px; font-weight:700;">
            제안서 작성
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
    
    // Bind table buttons
    document.querySelectorAll('.btn-analyze-brand').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const name = ev.currentTarget.getAttribute('data-name');
        openAnalysisModal(name);
      });
    });
    
    // Update pagination info text
    document.getElementById('pagination-info-text').textContent = `전체 ${allAdvertisers.length}건 중 ${startIdx + 1}-${endIdx} 표시`;
    
    // Render pagination buttons
    renderPaginationButtons();
  }

  function renderPaginationButtons() {
    const container = document.getElementById('table-pagination');
    if (!container) return;
    container.innerHTML = '';
    
    const totalPages = Math.ceil(allAdvertisers.length / pageSize);
    if (totalPages <= 1) return;
    
    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = `btn btn-secondary btn-xs ${currentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prevBtn.type = 'button';
    if (currentPage > 1) {
      prevBtn.addEventListener('click', () => {
        currentPage--;
        renderTablePage(currentPage);
      });
    }
    container.appendChild(prevBtn);
    
    // Page Numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    
    for (let p = startPage; p <= endPage; p++) {
      const pageBtn = document.createElement('button');
      pageBtn.type = 'button';
      pageBtn.className = `btn btn-secondary btn-xs ${p === currentPage ? 'active' : ''}`;
      pageBtn.textContent = p;
      pageBtn.addEventListener('click', () => {
        currentPage = p;
        renderTablePage(currentPage);
      });
      container.appendChild(pageBtn);
    }
    
    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = `btn btn-secondary btn-xs ${currentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    if (currentPage < totalPages) {
      nextBtn.addEventListener('click', () => {
        currentPage++;
        renderTablePage(currentPage);
      });
    }
    container.appendChild(nextBtn);
  }

  async function loadAdvertisersData(e) {
    if (e) e.preventDefault();
    
    const payload = {
      gender: genderInput ? genderInput.value : '전체',
      age: document.getElementById('filter-age').value,
      category: document.getElementById('filter-category').value,
      period: periodInput ? periodInput.value : '최근 1년',
      minScore: scoreMinInput ? parseInt(scoreMinInput.value) : 0,
      maxScore: scoreMaxInput ? parseInt(scoreMaxInput.value) : 100
    };
    
    try {
      const response = await fetch('/api/mock/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!data.success) return;
      
      // Update Summary Cards
      if (summaryTotal) summaryTotal.textContent = data.summary.totalAnalyzed.toLocaleString() + '명';
      if (summaryIssue) summaryIssue.textContent = data.summary.issueCount.toLocaleString() + '명';
      if (summaryAvg) summaryAvg.textContent = data.summary.avgScore + '점';
      if (summaryMax) summaryMax.textContent = data.summary.maxScore + '점';
      
      // Update Distribution Donut Chart
      renderDistributionChart(data.distribution);
      
      // Store list and reset page
      allAdvertisers = data.advertisers;
      currentPage = 1;
      
      // Render first page of table
      renderTablePage(currentPage);
      
    } catch (err) {
      console.error('Error fetching advertiser data:', err);
    }
  }

  // Handle page size change
  const pageSizeSelect = document.getElementById('pagination-page-size');
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', (ev) => {
      pageSize = parseInt(ev.target.value);
      currentPage = 1;
      renderTablePage(currentPage);
    });
  }

  if (advertiserForm) {
    advertiserForm.addEventListener('submit', loadAdvertisersData);
  }

  // ----------------------------------------------------
  // Modal Popup & AI Analysis Trigger Logic
  // ----------------------------------------------------
  const modal = document.getElementById('advertiser-analysis-modal');
  const btnCloseModal = document.getElementById('btn-close-analysis-modal');
  const btnCloseModalAction = document.getElementById('btn-modal-close-action');
  const btnProposalAction = document.getElementById('btn-modal-proposal-action');
  const loadingContainer = document.getElementById('modal-loading-container');
  const resultContainer = document.getElementById('modal-analysis-content');
  
  let activeModalBrandName = '';

  function openAnalysisModal(brandName) {
    if (!modal) return;
    activeModalBrandName = brandName;
    modal.classList.remove('hidden');
    
    // Reset view states
    if (loadingContainer) loadingContainer.style.display = 'flex';
    if (resultContainer) {
      resultContainer.classList.add('hidden');
      resultContainer.innerHTML = '';
    }
    
    // Fetch AI Analysis Report
    fetchAIAnalysis(brandName);
  }

  function closeAnalysisModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    activeModalBrandName = '';
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeAnalysisModal);
  if (btnCloseModalAction) btnCloseModalAction.addEventListener('click', closeAnalysisModal);
  
  // Close modal when clicking on overlay background
  if (modal) {
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) {
        closeAnalysisModal();
      }
    });
  }

  async function fetchAIAnalysis(brandName) {
    try {
      const response = await fetch('/api/ai/analyze-advertiser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: brandName })
      });
      
      const data = await response.json();
      
      if (loadingContainer) loadingContainer.style.display = 'none';
      if (resultContainer) {
        resultContainer.classList.remove('hidden');
        if (data.success && data.report) {
          resultContainer.innerHTML = parseMarkdown(data.report);
        } else {
          resultContainer.innerHTML = `<p class="warning-text" style="color:var(--neon-orange); padding:20px; text-align:center;">AI 심층 영업 분석 보고서를 로드하지 못했습니다: ${data.error || '알 수 없는 오류'}</p>`;
        }
      }
    } catch (e) {
      console.error("Error loading advertiser analysis:", e);
      if (loadingContainer) loadingContainer.style.display = 'none';
      if (resultContainer) {
        resultContainer.classList.remove('hidden');
        resultContainer.innerHTML = `<p class="warning-text" style="color:var(--neon-orange); padding:20px; text-align:center;">서버 연결 에러가 발생했습니다.</p>`;
      }
    }
  }

  // Handle modal create proposal CTA button
  if (btnProposalAction) {
    btnProposalAction.addEventListener('click', () => {
      if (!activeModalBrandName) return;
      
      // Set proposal inputs
      const clientInput = document.getElementById('proposal-client-name');
      const segmentInput = document.getElementById('proposal-target-segment');
      
      if (clientInput) clientInput.value = activeModalBrandName;
      if (segmentInput) segmentInput.value = '최근 크롤링 기반 이슈 광고주 센터 분석 연계';
      
      // Close modal
      closeAnalysisModal();
      
      // Navigate to proposal tab
      switchTab('proposal-generator');
    });
  }

  // Bind guide card button
  const btnCreateProposalFromGuide = document.getElementById('btn-create-proposal-from-guide');
  if (btnCreateProposalFromGuide) {
    btnCreateProposalFromGuide.addEventListener('click', () => {
      // Find top advertiser or open proposal tab directly
      if (allAdvertisers.length > 0) {
        const topAdv = allAdvertisers[0];
        const clientInput = document.getElementById('proposal-client-name');
        const segmentInput = document.getElementById('proposal-target-segment');
        if (clientInput) clientInput.value = topAdv.name;
        if (segmentInput) segmentInput.value = '최근 크롤링 기반 이슈 광고주 센터 분석 연계';
      }
      switchTab('proposal-generator');
    });
  }

  // Bind info box criteria button
  const btnShowScoreCriteria = document.getElementById('btn-show-score-criteria');
  if (btnShowScoreCriteria) {
    btnShowScoreCriteria.addEventListener('click', () => {
      // Open modal showing scoring criteria
      if (!modal) return;
      modal.classList.remove('hidden');
      if (loadingContainer) loadingContainer.style.display = 'none';
      if (resultContainer) {
        resultContainer.classList.remove('hidden');
        resultContainer.innerHTML = `
          <h3>📊 이슈 스코어 100점 만점 평가 기준</h3>
          <p style="margin-bottom: 15px; color: var(--text-secondary);">최근 1년간 웹 크롤링 데이터(뉴스, 블로그, SNS, 커뮤니티, 검색량)를 분석하여 마케팅 가치와 이슈도를 평가합니다.</p>
          
          <table class="data-table" style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <thead>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                <th style="text-align:left; padding:8px; font-size:11px;">평가 지표</th>
                <th style="text-align:left; padding:8px; font-size:11px;">배점</th>
                <th style="text-align:left; padding:8px; font-size:11px;">세부 산출 기준</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:10px 8px; font-weight:700; font-size:11px;">① 최근성</td>
                <td style="padding:10px 8px; color:var(--neon-blue); font-weight:700; font-size:11px;">30점</td>
                <td style="padding:10px 8px; font-size:10px; color:var(--text-secondary); line-height:1.4;">
                  최근 30일 이내 이슈 = 30점 | 최근 90일 = 25점<br>
                  최근 180일 = 20점 | 최근 1년 = 15점 | 1년 이상 = 5점
                </td>
              </tr>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:10px 8px; font-weight:700; font-size:11px;">② 이슈 확산도</td>
                <td style="padding:10px 8px; color:var(--neon-blue); font-weight:700; font-size:11px;">20점</td>
                <td style="padding:10px 8px; font-size:10px; color:var(--text-secondary); line-height:1.4;">
                  뉴스 기사 증가율, SNS 공유수, 커뮤니티 언급량,<br>
                  네이버 블로그 증가율이 높을수록 점수 상승
                </td>
              </tr>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:10px 8px; font-weight:700; font-size:11px;">③ 검색량 증가율</td>
                <td style="padding:10px 8px; color:var(--neon-blue); font-weight:700; font-size:11px;">20점</td>
                <td style="padding:10px 8px; font-size:10px; color:var(--text-secondary); line-height:1.4;">
                  최근 검색량 대비 증가율:<br>
                  300% 이상 = 20점 | 200% = 18점 | 150% = 15점 | 100% = 10점 | 50% = 5점
                </td>
              </tr>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:10px 8px; font-weight:700; font-size:11px;">④ 광고 가능성</td>
                <td style="padding:10px 8px; color:var(--neon-blue); font-weight:700; font-size:11px;">15점</td>
                <td style="padding:10px 8px; font-size:10px; color:var(--text-secondary); line-height:1.4;">
                  신제품 출시, 신규 서비스 런칭, 신규 매장 오픈, 브랜드 리뉴얼,<br>
                  행사 진행, 이벤트/프로모션 진행 여부로 판단
                </td>
              </tr>
              <tr>
                <td style="padding:10px 8px; font-weight:700; font-size:11px;">⑤ 브랜드 성장성</td>
                <td style="padding:10px 8px; color:var(--neon-blue); font-weight:700; font-size:11px;">15점</td>
                <td style="padding:10px 8px; font-size:10px; color:var(--text-secondary); line-height:1.4;">
                  투자 유치 규모, IPO 추진 여부, 가맹점/매장 증가세,<br>
                  매출 및 고객수 성장세, 신규 사업 분야 진출 여부
                </td>
              </tr>
            </tbody>
          </table>
        `;
      }
    });
  }

  // Load initial data on startup
  loadAdvertisersData();

  // Phase 2: 시장조사 & 경쟁사 분석 로직
  // ----------------------------------------------------
  const marketFilterForm = document.getElementById('market-filter-form');
  const marketTypeIcon = document.getElementById('market-sum-type-icon');
  const marketTypeTitle = document.getElementById('market-sum-type');
  const marketTypeDesc = document.getElementById('market-sum-type-desc');
  const marketScoreVal = document.getElementById('market-sum-score');
  const marketScoreBadge = document.getElementById('market-sum-score-badge');
  const marketScoreStars = document.getElementById('market-sum-stars');
  const marketCagrVal = document.getElementById('market-sum-cagr');
  const marketSomVal = document.getElementById('market-sum-som');
  const marketAdSizeVal = document.getElementById('market-sum-adsize');

  const detailTam = document.getElementById('market-detail-tam');
  const detailSam = document.getElementById('market-detail-sam');
  const detailSom = document.getElementById('market-detail-som');

  const adSizeDetail = document.getElementById('ad-detail-size');
  const adOnlineDetail = document.getElementById('ad-detail-online');
  const adOfflineDetail = document.getElementById('ad-detail-offline');
  const adGrowthDetail = document.getElementById('ad-detail-growth');
  const adPlatformsDetail = document.getElementById('ad-detail-platforms');
  const adCpcDetail = document.getElementById('ad-detail-cpc');
  const adCpaDetail = document.getElementById('ad-detail-cpa');
  const adRoasDetail = document.getElementById('ad-detail-roas');
  const adCacDetail = document.getElementById('ad-detail-cac');

  const summaryTam = document.getElementById('summary-lbl-tam');
  const summarySam = document.getElementById('summary-lbl-sam');
  const summarySom = document.getElementById('summary-lbl-som');
  const summaryCagr = document.getElementById('summary-lbl-cagr');
  const summaryType = document.getElementById('summary-lbl-type');

  const finalScore = document.getElementById('final-summary-score');
  const finalStars = document.getElementById('final-summary-stars');
  const finalDecision = document.getElementById('final-summary-decision');

  let activeMarketReport = '';

  // Chart instances
  let cagrSparklineChart = null;
  let somSparklineChart = null;
  let adSparklineChart = null;
  let marketGrowthChart = null;
  let marketRadarChart = null;
  let marketGaugeChart = null;

  function renderMarketCharts(data) {
    // 1. CAGR Sparkline (Line)
    const cagrCanvas = document.getElementById('chart-cagr-sparkline');
    if (cagrCanvas) {
      const cagrCtx = cagrCanvas.getContext('2d');
      if (cagrSparklineChart) cagrSparklineChart.destroy();
      cagrSparklineChart = new Chart(cagrCtx, {
        type: 'line',
        data: {
          labels: data.cagrChart.map(c => c.year),
          datasets: [{
            data: data.cagrChart.map(c => c.rate),
            borderColor: '#00f2fe',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { display: false }, y: { display: false } }
        }
      });
    }

    // 2. SOM Sparkline (Doughnut progress)
    const somCanvas = document.getElementById('chart-som-sparkline');
    if (somCanvas) {
      const somCtx = somCanvas.getContext('2d');
      if (somSparklineChart) somSparklineChart.destroy();
      const somRate = 7.5; // average of 5-10
      somSparklineChart = new Chart(somCtx, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [somRate, 100 - somRate],
            backgroundColor: ['#22c55e', 'rgba(255,255,255,0.05)'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          cutout: '70%'
        }
      });
    }

    // 3. Ad Sparkline (Bar)
    const adCanvas = document.getElementById('chart-ad-sparkline');
    if (adCanvas) {
      const adCtx = adCanvas.getContext('2d');
      if (adSparklineChart) adSparklineChart.destroy();
      adSparklineChart = new Chart(adCtx, {
        type: 'bar',
        data: {
          labels: data.cagrChart.map(c => c.year),
          datasets: [{
            data: data.cagrChart.map(c => c.size),
            backgroundColor: '#ff9f1c',
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { display: false }, y: { display: false } }
        }
      });
    }

    // 4. Market Growth (Bar + Line)
    const growthCanvas = document.getElementById('chart-market-growth');
    if (growthCanvas) {
      const growthCtx = growthCanvas.getContext('2d');
      if (marketGrowthChart) marketGrowthChart.destroy();
      marketGrowthChart = new Chart(growthCtx, {
        type: 'bar',
        data: {
          labels: data.cagrChart.map(c => c.year),
          datasets: [
            {
              label: '시장 규모 (억원)',
              type: 'bar',
              data: data.cagrChart.map(c => c.size),
              backgroundColor: 'rgba(59, 130, 246, 0.4)',
              borderColor: '#3b82f6',
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              label: '성장률 (%)',
              type: 'line',
              data: data.cagrChart.map(c => c.rate),
              borderColor: '#00f2fe',
              borderWidth: 1.5,
              pointBackgroundColor: '#00f2fe',
              pointRadius: 3,
              fill: false,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: 'var(--text-muted)', font: { size: 9 } }
            },
            y: {
              position: 'left',
              grid: { color: 'rgba(255,255,255,0.03)' },
              ticks: { color: 'var(--text-muted)', font: { size: 9 } }
            },
            y1: {
              position: 'right',
              grid: { display: false },
              ticks: { color: 'var(--text-muted)', font: { size: 9 } }
            }
          }
        }
      });
    }

    // 5. Market Radar Chart
    const radarCanvas = document.getElementById('chart-market-radar');
    if (radarCanvas) {
      const radarCtx = radarCanvas.getContext('2d');
      if (marketRadarChart) marketRadarChart.destroy();
      
      const rScores = data.radarScores;
      marketRadarChart = new Chart(radarCtx, {
        type: 'radar',
        data: {
          labels: ['TAM', 'SAM', 'SOM', '성장률', '경쟁도', '진입장벽', '차별화', '광고시장', '고객확보', '수익성'],
          datasets: [{
            data: [rScores.tam, rScores.sam, rScores.som, rScores.cagr, rScores.경쟁강도, rScores.진입장벽, rScores.차별화, rScores.광고시장, rScores.고객확보, rScores.수익성],
            backgroundColor: 'rgba(0, 242, 254, 0.1)',
            borderColor: 'var(--neon-blue)',
            borderWidth: 1.5,
            pointBackgroundColor: 'var(--neon-blue)',
            pointRadius: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            r: {
              grid: { color: 'rgba(255,255,255,0.04)' },
              angleLines: { color: 'rgba(255,255,255,0.04)' },
              ticks: { display: false },
              pointLabels: { color: 'var(--text-muted)', font: { size: 8 } },
              suggestedMin: 0,
              suggestedMax: 15
            }
          }
        }
      });
    }

    // 6. Gauge Chart (Half Doughnut)
    const gaugeCanvas = document.getElementById('chart-market-gauge');
    if (gaugeCanvas) {
      const gaugeCtx = gaugeCanvas.getContext('2d');
      if (marketGaugeChart) marketGaugeChart.destroy();
      
      let gaugeColor = '#00f2fe'; // Blue Ocean
      if (data.summary.type === '퍼플오션') gaugeColor = '#a855f7';
      else if (data.summary.type === '레드오션') gaugeColor = '#ef4444';

      marketGaugeChart = new Chart(gaugeCtx, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [data.summary.score, 100 - data.summary.score],
            backgroundColor: [gaugeColor, 'rgba(255,255,255,0.05)'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          rotation: 270,
          circumference: 180,
          cutout: '80%'
        }
      });
    }
  }

  function renderMarketData(data) {
    // 1. Text & Summary Card values
    if (marketTypeTitle) marketTypeTitle.textContent = data.summary.type;
    
    if (marketTypeIcon) {
      if (data.summary.type === '블루오션') {
        marketTypeIcon.className = 'fa-solid fa-water';
        marketTypeIcon.style.color = 'var(--neon-blue)';
        marketTypeIcon.parentElement.style.background = 'rgba(0, 242, 254, 0.1)';
        marketTypeIcon.parentElement.style.borderColor = 'rgba(0, 242, 254, 0.2)';
        if (marketTypeDesc) marketTypeDesc.textContent = '경쟁이 낮고 성장 가능성이 높은 시장';
        if (marketScoreBadge) {
          marketScoreBadge.style.background = 'rgba(0, 242, 254, 0.15)';
          marketScoreBadge.style.color = 'var(--neon-blue)';
          marketScoreBadge.style.borderColor = 'rgba(0, 242, 254, 0.3)';
          marketScoreBadge.textContent = '진입 추천';
        }
      } else if (data.summary.type === '퍼플오션') {
        marketTypeIcon.className = 'fa-solid fa-compass';
        marketTypeIcon.style.color = '#a855f7';
        marketTypeIcon.parentElement.style.background = 'rgba(168, 85, 247, 0.1)';
        marketTypeIcon.parentElement.style.borderColor = 'rgba(168, 85, 247, 0.2)';
        if (marketTypeDesc) marketTypeDesc.textContent = '경쟁과 기회가 공존하는 시장';
        if (marketScoreBadge) {
          marketScoreBadge.style.background = 'rgba(168, 85, 247, 0.15)';
          marketScoreBadge.style.color = '#a855f7';
          marketScoreBadge.style.borderColor = 'rgba(168, 85, 247, 0.3)';
          marketScoreBadge.textContent = '시장 검토';
        }
      } else {
        marketTypeIcon.className = 'fa-solid fa-fire';
        marketTypeIcon.style.color = '#ef4444';
        marketTypeIcon.parentElement.style.background = 'rgba(239, 68, 68, 0.1)';
        marketTypeIcon.parentElement.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        if (marketTypeDesc) marketTypeDesc.textContent = '경쟁이 치열하고 진입 장벽이 높은 시장';
        if (marketScoreBadge) {
          marketScoreBadge.style.background = 'rgba(239, 68, 68, 0.15)';
          marketScoreBadge.style.color = '#ef4444';
          marketScoreBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
          marketScoreBadge.textContent = '제한적 진입';
        }
      }
    }

    if (marketScoreVal) marketScoreVal.innerHTML = `${data.summary.score} <span style="font-size: 10px; color: var(--text-muted);">/ 100</span>`;
    
    let starStr = '★★★';
    if (data.summary.score >= 90) starStr = '★★★★★';
    else if (data.summary.score >= 80) starStr = '★★★★☆';
    else if (data.summary.score >= 70) starStr = '★★★★';
    else if (data.summary.score >= 60) starStr = '★★★☆';
    
    if (marketScoreStars) marketScoreStars.textContent = starStr;
    if (marketCagrVal) marketCagrVal.textContent = data.summary.cagr;
    if (marketSomVal) marketSomVal.textContent = data.summary.som;
    if (marketAdSizeVal) marketAdSizeVal.textContent = data.summary.adMarketSize;

    if (detailTam) detailTam.textContent = data.marketSize.tam;
    if (detailSam) detailSam.textContent = data.marketSize.sam;
    if (detailSom) detailSom.textContent = data.marketSize.som;

    // Ad analysis details
    if (adSizeDetail) adSizeDetail.textContent = data.adAnalysis.adMarketSize;
    if (adOnlineDetail) adOnlineDetail.textContent = data.adAnalysis.onlineRatio;
    if (adOfflineDetail) adOfflineDetail.textContent = data.adAnalysis.offlineRatio;
    if (adGrowthDetail) adGrowthDetail.textContent = data.adAnalysis.growthRate;
    if (adPlatformsDetail) {
      adPlatformsDetail.textContent = data.adAnalysis.platforms;
      adPlatformsDetail.title = data.adAnalysis.platforms;
    }
    if (adCpcDetail) adCpcDetail.textContent = data.adAnalysis.cpc;
    if (adCpaDetail) adCpaDetail.textContent = data.adAnalysis.cpa;
    if (adRoasDetail) adRoasDetail.textContent = data.adAnalysis.roas;
    if (adCacDetail) adCacDetail.textContent = data.adAnalysis.cac;

    // Final summary card
    if (summaryTam) summaryTam.textContent = data.marketSize.tam;
    if (summarySam) summarySam.textContent = data.marketSize.sam;
    if (summarySom) summarySom.textContent = data.marketSize.som;
    if (summaryCagr) summaryCagr.textContent = data.summary.cagr;
    if (summaryType) {
      summaryType.textContent = data.summary.type;
      summaryType.style.color = data.summary.type === '블루오션' ? 'var(--neon-blue)' : (data.summary.type === '퍼플오션' ? '#a855f7' : '#ef4444');
    }

    if (finalScore) finalScore.innerHTML = `${data.summary.score} <span style="font-size: 12px; color: var(--text-muted);">/ 100</span>`;
    if (finalStars) finalStars.textContent = starStr;
    if (finalDecision) finalDecision.textContent = data.summary.score >= 80 ? '진입 추천' : (data.summary.score < 60 ? '비추천' : '조건부 진입');

    // 2. Render Competitors Table
    const compTableBody = document.querySelector('#table-market-competitors tbody');
    if (compTableBody) {
      compTableBody.innerHTML = '';
      data.competitors.forEach(comp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="text-align:center; vertical-align:middle;">
            <span class="rank-badge ${comp.rank === 1 ? 'rank-1' : (comp.rank === 2 ? 'rank-2' : (comp.rank === 3 ? 'rank-3' : 'rank-other'))}" style="width:18px; height:18px; font-size:10px;">${comp.rank}</span>
          </td>
          <td style="vertical-align:middle;"><strong>${comp.name}</strong></td>
          <td style="vertical-align:middle;">${comp.share}</td>
          <td style="vertical-align:middle; font-size: 10px;">${comp.strength}</td>
          <td style="vertical-align:middle; font-size: 10px;">${comp.weakness}</td>
          <td style="text-align:center; vertical-align:middle;">
            <span class="badge" style="font-size: 9px; background: ${comp.aiAdoption === '높음' ? 'rgba(0, 242, 254, 0.15)' : (comp.aiAdoption === '보통' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.05)')}; color: ${comp.aiAdoption === '높음' ? 'var(--neon-blue)' : (comp.aiAdoption === '보통' ? '#a855f7' : 'var(--text-muted)')}; border: 1px solid rgba(255,255,255,0.05);">${comp.aiAdoption}</span>
          </td>
        `;
        compTableBody.appendChild(tr);
      });
    }

    // 3. Render Features comparison checklist
    const featTableBody = document.querySelector('#table-market-features tbody');
    if (featTableBody) {
      featTableBody.innerHTML = '';
      data.features.forEach(f => {
        const tr = document.createElement('tr');
        
        const checkIcon = (val) => {
          if (val === 'Y') return '<i class="fa-solid fa-check-circle" style="color:#22c55e;"></i>';
          if (val === 'P') return '<i class="fa-solid fa-warning" style="color:#ff9f1c;"></i>';
          return '<i class="fa-solid fa-times-circle" style="color:#ef4444;"></i>';
        };

        tr.innerHTML = `
          <td style="text-align:left; vertical-align:middle; font-weight:700;">${f.name}</td>
          <td style="vertical-align:middle;">${checkIcon(f.a)}</td>
          <td style="vertical-align:middle;">${checkIcon(f.b)}</td>
          <td style="vertical-align:middle;">${checkIcon(f.c)}</td>
          <td style="vertical-align:middle;">${checkIcon(f.d)}</td>
          <td style="vertical-align:middle;">${checkIcon(f.e)}</td>
          <td style="vertical-align:middle; background: rgba(0,242,254,0.03);">${checkIcon(f.our)}</td>
        `;
        featTableBody.appendChild(tr);
      });
    }

    // 4. Render Barriers list
    const barrierList = document.getElementById('market-barriers-list');
    if (barrierList) {
      barrierList.innerHTML = '';
      const bKeys = [
        { label: '기술 장벽', val: data.barriers.technology },
        { label: '자본 규모', val: data.barriers.capital },
        { label: '브랜드 인지도', val: data.barriers.brand },
        { label: '법적 규제', val: data.barriers.regulation },
        { label: '인허가 장벽', val: data.barriers.licensing },
        { label: '네트워크 효과', val: data.barriers.network },
        { label: '기존 경쟁사 점유', val: data.barriers.competitor }
      ];

      bKeys.forEach(bk => {
        let dotClass = 'yellow'; // 보통
        if (bk.val === '낮음') dotClass = 'green';
        else if (bk.val === '높음') dotClass = 'red';

        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
        div.style.paddingBottom = '4px';
        div.innerHTML = `
          <span>${bk.label}</span>
          <span style="display:flex; align-items:center; font-weight:600;"><span class="dot-status ${dotClass}"></span>${bk.val}</span>
        `;
        barrierList.appendChild(div);
      });
    }

    // 5. Render BM recommendations
    const bmContainer = document.getElementById('market-bm-container');
    if (bmContainer) {
      bmContainer.innerHTML = '';
      data.bms.forEach(bm => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '10px';
        div.style.background = 'rgba(255,255,255,0.02)';
        div.style.border = '1px solid rgba(255,255,255,0.04)';
        div.style.borderRadius = '6px';
        div.style.padding = '6px 12px';
        div.innerHTML = `
          <i class="fa-solid fa-circle-check text-blue" style="font-size:12px; color:var(--neon-blue);"></i>
          <span style="font-size:11px; font-weight:700; color:#fff;">${bm}</span>
        `;
        bmContainer.appendChild(div);
      });
    }

    // 6. Render Services TOP 5
    const servicesList = document.getElementById('market-services-list');
    if (servicesList) {
      servicesList.innerHTML = '';
      const top5 = data.services.slice(0, 5);
      top5.forEach((srv, idx) => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '10px';
        div.innerHTML = `
          <span class="rank-badge rank-other" style="width:18px; height:18px; font-size:10px;">${idx + 1}</span>
          <span style="font-size:11px; color:#fff; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${srv}">${srv}</span>
        `;
        servicesList.appendChild(div);
      });
    }

    // 7. Render Charts
    renderMarketCharts(data);
  }

  async function runMarketAnalysis(e) {
    if (e) e.preventDefault();
    
    // Show global loading spinner only for explicit user actions (when 'e' is passed)
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');
    if (e && loadingOverlay) {
      loadingMessage.textContent = 'AI가 시장 지표 및 경쟁사 데이터를 심층 분석 중입니다...';
      loadingOverlay.classList.remove('hidden');
    }

    const payload = {
      industry: document.getElementById('market-filter-industry').value,
      subCategory: document.getElementById('market-filter-subcategory').value,
      country: document.getElementById('market-filter-country').value
    };

    try {
      const response = await fetch('/api/ai/market-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const resData = await response.json();
      
      if (loadingOverlay) loadingOverlay.classList.add('hidden');

      if (resData.success && resData.data) {
        activeMarketReport = resData.report;
        renderMarketData(resData.data);
      } else {
        alert('시장 분석 데이터를 불러오지 못했습니다.');
      }
    } catch (err) {
      console.error('Error fetching market analysis:', err);
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
      alert('서버 연결 중 에러가 발생했습니다.');
    }
  }

  if (marketFilterForm) {
    marketFilterForm.addEventListener('submit', runMarketAnalysis);
  }

  // Bind all detailed report modal triggers
  document.addEventListener('click', (ev) => {
    if (ev.target && ev.target.closest('.btn-show-market-detail')) {
      if (!activeMarketReport) return alert('먼저 분석 실행을 수행해 주세요.');
      
      // We open the analysis modal and render the markdown report
      const modal = document.getElementById('advertiser-analysis-modal');
      const loadingContainer = document.getElementById('modal-loading-container');
      const resultContainer = document.getElementById('modal-analysis-content');
      
      if (modal) {
        modal.classList.remove('hidden');
        if (loadingContainer) loadingContainer.style.display = 'none';
        if (resultContainer) {
          resultContainer.classList.remove('hidden');
          resultContainer.innerHTML = parseMarkdown(activeMarketReport);
        }
      }
    }
  });

  // Run initial market analysis on startup
  setTimeout(() => {
    if (marketFilterForm) {
      runMarketAnalysis();
    }
  }, 100);
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

      // 안전한 AI fetch 래퍼 (서버 타임아웃, API Key 무효, 500 에러 시에도 로컬 mock 데이터로 복구)
      const fetchAIWithFallback = async (url, method, bodyObj, localFallbackReport, fallbackFields = {}) => {
        try {
          const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyObj)
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.success) {
              return data;
            }
          }
          console.warn(`API ${url} returned error status. Using fallback data.`);
          return { success: true, report: localFallbackReport, isFallback: true, ...fallbackFields };
        } catch (e) {
          console.warn(`Network error fetching ${url}. Using fallback data.`, e);
          return { success: true, report: localFallbackReport, isFallback: true, ...fallbackFields };
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
        
        const recMockText = `### 🤖 AI 분석 기반 초세분화(Micro-Segment) 광고주 추천 리포트 (Fallback 시뮬레이션)
행동 데이터 분석 결과, 아래와 같이 정밀하게 쪼개진 타겟 페르소나 지표에 따라 맞춤 광고주 매칭을 처방합니다.

#### 📊 분석된 초세분화 타겟 프로필
* **성별/연령**: 여성 / 30대
* **활동 지역/가입**: 경기 / 1년이상
* **선호 마케팅 업종**: 키즈카페
* **행동 지수**: 평균 찜하기 **${segData.metrics.avgWish}회**, 장바구니 적재 **${segData.metrics.avgCart}회**, 최근 결제 전환 **${segData.metrics.avgPurchase}회**

#### 🏆 추천 광고주 우선순위 목록
1. **뽀로로파크** (추천도: 🌟🌟🌟🌟🌟)
   - 업종: 레저·테마파크 / 경기권
   - 매칭 구좌: 스플래쉬 광고
   - 캠페인 제안: 주말 경기권 뽀로로파크 찜 회원 타겟 패키지 할인권 앱푸시 발송
2. **웅진 씽크빅 키즈스페이스** (추천도: 🌟🌟🌟🌟)
   - 업종: 교육·육아 / 전국권
   - 매칭 구좌: 카테고리 광고
   - 캠페인 제안: 놀발 내 교육 카테고리 상단 롤링 배너 상시 노출 및 도서 체험단 연동`;

        const recReportData = await fetchAIWithFallback('/api/ai/recommend-advertiser', 'POST', {
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
        }, recMockText);

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

        const marketMockText = `### 📊 가족 키즈카페 및 여가 액티비티 광고 시장 분석 리포트 (Fallback 시뮬레이션)

#### 1. 국내 키즈카페 및 레저 시장 규모 및 성장 전망
- **시장 트렌드**: 국내 아동 및 가족 여가 액티비티 시장은 연 평균 약 8.5%씩 성장 중입니다. 디지털 광고 마케팅 비중은 2026년 기준 68%를 돌파하여 오프라인 매체 대비 압도적인 비중을 차지합니다.
- **가족 여가 소비 패턴의 변화**:
  1. **초개인화(Hyper-personalization) 큐레이션**: 일반적인 광고 지면보다 아동 연령이나 부모의 동선에 맞춘 정교한 추천을 선호합니다.
  2. **모바일 퍼스트**: 예약의 90% 이상이 모바일 앱 채널에서 즉각적인 결제로 연결됩니다.

#### 2. 놀이의발견 비즈니스 기회 요인 (Opportunity)
- **정밀한 3040 구매 타겟 데이터**: 일반 포털과 다르게 구매력이 확실하고 육아에 집중된 정밀 타겟(30~40대 자녀 동반 부모)을 보유하고 있습니다.
- **광고-결제 원스톱 연동**: 광고 노출에서 그치지 않고 자사 앱 내에서 즉시 예약 및 사용처 인증까지 가능하므로 광고주에게 명확한 전환 데이터(RoAS)를 입증할 수 있습니다.`;

        const marketData = await fetchAIWithFallback('/api/ai/market-research', 'POST', {
          industry: '가족 키즈카페 및 여가 액티비티', 
          previousContext: chainContext()
        }, marketMockText);

        agentOutputs.push({ name: 'AI 시장조사', report: marketData.report });
        setItemComplete('deliv-2', parseMarkdown(marketData.report));

        // [크로스탭 반영] 시장조사 & 경쟁사 분석 탭에도 결과 적용
        if (researchResultArea && researchResultBody) {
          researchResultTitle.innerHTML = `<i class="fa-solid fa-magnifying-glass-chart text-teal"></i> [시장조사] 가족 키즈카페 및 여가 액티비티 분야 AI 분석 리포트`;
          researchResultBody.innerHTML = parseMarkdown(marketData.report);
          researchResultArea.classList.remove('hidden');
        }

        const compMockText = `### ⚔️ 경쟁 서비스 광고 상품 비교 분석 (Fallback 시뮬레이션)

요청하신 주요 경쟁사의 광고 상품 비교 분석 데이터입니다.

| 플랫폼명 | 주요 광고 상품 | 가격 정책 (추정) | 장점 | 단점 / 극복 방안 (놀이의발견 차별점) |
| :--- | :--- | :--- | :--- | :--- |
| **야놀자/여기어때** | 메인 배너, 검색 상단 노출, 기획전 롤링 | 월 200~1,000만원 대 (정액/정률) | 압도적인 트래픽과 풍부한 유저 풀 | 타겟층이 전 연령대에 분산되어 있어 **가족/아동 중심 브랜드 광고 효율이 희석됨** |
| **네이버 플레이스** | 플레이스 광고 (CPC), 지역 소상공인 추천 | CPC 입찰 (클릭당 50~1,000원) | 네이버 지도와의 완벽한 연계성 | 노출 범위가 광범위하나 **진성 육아 유저만을 걸러내는 타겟 발송 불가** |
| **놀이의발견 (자사)** | **개인화 푸시 알림, 연령/지역 기반 홈 배너** | **노출당 단가(CPM) 및 전환 성과 연동** | **3040 부모 회원 100% 매칭** | 트래픽 규모는 중형급이나 **전환 단가(CPA) 면에서 경쟁사 대비 최대 3배 효율** 제공 가능 |

#### 💡 놀이의발견 광고 전략 제언
- **타겟 패키지화**: 단순 배너 노출보다, '이번주 주말 경기권 키즈카페 찜 유저 대상 앱푸시 + 홈 배너' 형태로 묶어 패키지 광고 상품군을 신설하여 판매 단가 업셀링을 유도해야 합니다.`;

        const compData = await fetchAIWithFallback('/api/ai/competitor-analysis', 'POST', {
          competitors: '한화리조트, 에버랜드, 네이버 플레이스', 
          previousContext: chainContext()
        }, compMockText);

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

        const proposalMockText = `### 🤖 [웅진컴퍼스 놀이의발견] AI 기반 맞춤형 광고 기획 제안서 (13 Pages Full Draft)
**제안 대상:** 풀무원 키즈랜드 귀사
**제안사:** 웅진컴퍼스 | 플랫폼사업기획팀
**작성일:** ${new Date().toISOString().split('T')[0]}

---

### 📄 Page 1: Executive Summary
* **① 제목**: 179만 가정이 움직이는 순간, 놀이의발견 비즈니스 제안
* **② 핵심 메시지**: 대한민국 NO.1 가족 여가 플랫폼 놀이의발견이 귀사의 매출을 도약시킵니다.
* **③ 본문**: 놀이의발견은 실구매력이 검증된 3040 부모 유저들이 밀집된 대한민국 1위 여가 큐레이션 예약 앱입니다. 본 제안서는 귀사 브랜드를 최우선 매칭하여 유입부터 결제 완료까지 성과를 견인하는 마케팅 로드맵을 제안합니다.
* **④ KPI**: 신규 고객 유입량 150% 증대, 브랜드 인지도 80% 상승
* **⑤ 표**: [타겟 도달 비교] 놀이의발견 (98% 도달) vs 일반 포털 매체 (23% 도달)
* **⑥ 추천 차트**: 타겟 집중도 대비 도달률 비교 막대형 차트
* **⑦ 인포그래픽 설명**: 3040 부모 유저가 98% 도달되는 타겟 집중 깔때기 도식
* **⑧ Hero Image 설명**: 모던한 화이트 배경에서 스마트 기기를 보며 기뻐하는 부모와 행복한 한국 아이의 프리미엄 이미지
* **⑨ AI 이미지 생성 Prompt (영문)**: A premium commercial photograph of a happy Korean child laughing in a sunny green garden, parents next to the child holding a modern smartphone showing a lifestyle app, minimal white background, soft natural lighting, volumetric rays, Apple Keynote presentation style, high detail, ultra-realistic, 8k resolution, shot on 85mm lens. --ar 16:9
* **⑩ Negative Prompt**: text, logo, watermark, signature, frames, bad hands, cartoon, illustration, low contrast, dark background, low quality.
* **⑪ PPT 레이아웃**: 좌측 텍스트 40%, 우측 카드형 이미지 및 핵심 수치 블록 60%
* **⑫ Figma 레이아웃**: Auto-layout Frame, 2-column grid, margins 80px, corner radius 24px
* **⑬ 추천 아이콘**: 📈 (성장), 🎯 (타겟)
* **⑭ 컬러**: Primary Crimson (#FF3B30), Neutral Dark (#0A0C16), Point Gold (#FFB900)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 36px, Medium 16px)
* **⑯ 발표 멘트**: "안녕하십니까. 오늘 저희가 준비한 광고 제안서는..."
* **⑰ CTA**: [놀이의발견 입점 파트너 제휴 신청하기]
* **Image Concept**: Premium Family Lifestyle
* **Camera Angle**: Eye Level, Medium Shot
* **Lighting**: Bright Sunny Natural Backlight
* **Mood**: Happy, Energetic, Warm, Trustworthy
* **Composition**: Dynamic center focus on the family
* **Aspect Ratio**: 16:9

---

### 📄 Page 2: 회사 소개 및 놀이의발견 히스토리
* **① 제목**: 웅진컴퍼스 자회사, 놀이의발견 히스토리
* **② 핵심 메시지**: 검증된 투자유치와 기업 신뢰도가 바탕이 된 튼튼한 마케팅 파트너십
* **③ 본문**:
  - 2018.04: 웅진씽크빅 키즈플랫폼 사업부 신설
  - 2020.05: 웅진씽크빅 100% 자회사로 공식 분사 및 시리즈B 200억원 규모 투자 유치 완료
  - 2021.02: 가입 유저 100만 명 돌성 및 전국 단위 숙박 카테고리 예약 서비스 공식 론칭
  - 2024.12: 웅진컴퍼스 X 놀이의발견 합병을 통한 라이프스타일 거대 연합 플랫폼 도약
* **④ KPI**: 누적 200억 이상 유치된 자본력 기반의 안정적이고 지속적인 플랫폼 마케팅 보증
* **⑤ 표**: [연도별 플랫폼 투자 및 성장 추이 요약] 연도, 회원 수, 거래액, 유치 투자금 정리
* **⑥ 추천 차트**: 회원 수 성장 그래프와 거래액 성장의 우상향 추이를 겹쳐 놓은 이중 축 혼합 차트
* **⑦ 인포그래픽 설명**: 2018년 신설부터 2024년 합병에 이르기까지 타임라인 연혁의 계단식 도식화
* **⑧ Hero Image 설명**: 모던하고 깨끗한 원목 책상 주변에 웅진컴퍼스의 마케팅 전략가들이 신뢰 가득하게 회의하는 모습
* **⑨ AI 이미지 생성 Prompt (영문)**: A premium corporate photography of professional Korean marketing team working together around a clean modern wooden desk in a bright office, minimal white wall background, natural soft lighting, commercial photography, Apple Keynote style, high detail, 8k. --ar 16:9
* **⑩ Negative Prompt**: text, bad faces, dark office, messy tables.
* **⑪ PPT 레이아웃**: 좌측 60% 타임라인 세부 연혁 텍스트 블록, 우측 40% 모던한 오피스 시각 디자인 카드
* **⑫ Figma 레이아웃**: Fixed left layout with margins 60px, Auto-layout list
* **⑬ 추천 아이콘**: 🤝 (제휴 신뢰), 🕰️ (연혁 타임라인)
* **⑭ 컬러**: Slate Gray (#64748B), Crimson Red (#FF3B30), Deep Dark Navy (#0B0D19)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 32px, Regular 14px)
* **⑯ 발표 멘트**: "저희 회사는 웅진씽크빅의 자회사로 출범하여 최근 웅진컴퍼스와의 전략적 합병을 통해 한 단계 크게 진화했습니다."
* **⑰ CTA**: [웅진컴퍼스 놀이의발견 상세 IR 자료 받아보기]
* **Image Concept**: Professional Collaborative Space
* **Camera Angle**: Wide Angle View
* **Lighting**: Bright Diffused Office Lighting
* **Mood**: Trustworthy, Visionary, Modern, Collaborative
* **Composition**: Clean horizontal workspace alignment
* **Aspect Ratio**: 16:9

---

### 📄 Page 3: 서비스 소개 및 타겟 지면 가치
* **① 제목**: 대한민국 1위 가족 여가 라이프스타일 예약 플랫폼
* **② 핵심 메시지**: 전국 3만 개 여가 시설 and 179만 부모 회원을 잇는 원스톱 관문
* **③ 본문**:
  - **키즈 테마파크/체험학습**: 전국 단위 어린이 놀이 콘텐츠 실시간 큐레이션 및 즉시 할인 딜 제공
  - **숙박 예약 서비스**: 키즈 펜션, 리조트, 글램핑 등 자녀 동반 맞춤형 가족 숙소 독점 특가 기획전 운영
  - **3040 부모 밀집도**: 일반 포털과 다르게 구매력이 확실하고 육아에 집중된 정밀 타겟(30~40대 부모) 100% 매치
* **④ KPI**: 키즈 여가 및 숙박 카테고리 시장 점유율 1위 유지
* **⑤ 표**: [경쟁 매체 대비 타겟 매칭 효율 비교] 매체 종류, 타겟 연령, 육아 관여도, 결제 전환율 정리
* **⑥ 추천 차트**: 타 매체 대비 놀이의발견의 구매 전환 효율 격차를 보여주는 3D 실린더 차트
* **⑦ 인포그래픽 설명**: 놀이의발견이 제공하는 3대 서비스 뼈대(놀이/숙박/배움) 구조의 입체 카드 레이아웃
* **⑧ Hero Image 설명**: 잔디밭 위에 예쁘게 쳐진 감성적인 흰색 텐트와 은은하게 빛나는 꼬마 전구의 캠핑 이미지
* **⑨ AI 이미지 생성 Prompt (영문)**: A luxury family camping site with a beautiful white canvas tent on a green grass field, premium wooden camping chairs, warm fairy lights lit during twilight, soft sunset glow, commercial luxury lifestyle, minimal sky background, 8k, ultra-realistic. --ar 16:9
* **⑩ Negative Prompt**: text, cartoon, low resolution, cheap plastics.
* **⑪ PPT 레이아웃**: 상단 30% 타이틀 및 소구점, 하단 70% 3열 반응형 정보 카드 배치
* **⑫ Figma 레이아웃**: Grid Layout 3 Columns, Gap 24px, inner glow border
* **⑬ 추천 아이콘**: 🏕️ (가족 캠핑/숙박), 🎡 (액티비티)
* **⑭ 컬러**: Forest Green (#22C55E), Ivory Gold (#FEF08A), Dark Navy (#0B0D19)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 32px, Regular 14px)
* **⑯ 발표 멘트**: "단순한 커뮤니티가 아닌 실제 레저, 키즈카페, 가족 숙소를 현장에서 직접 결제하고 이용하는 행동 유저의 성지입니다."
* **⑰ CTA**: [놀이의발견 서비스 제안 가이드 다운로드]
* **Image Concept**: Premium Glamping Lifestyle
* **Camera Angle**: Eye Level, Horizontal view
* **Lighting**: Warm Sunset Golden Hour Diffused glow
* **Mood**: Cozy, Warm, Organic, Premium
* **Composition**: Balanced symmetrical positioning of tent and chairs
* **Aspect Ratio**: 16:9

---

### 📄 Page 4: 플랫폼 트래픽 규모 및 회원 현황
* **① 제목**: 179만 가정이 매일 선택하는 압도적인 트래픽 규모
* **② 핵심 메시지**: 수치로 입증되는 브랜드 도달력과 단기간 캠페인 파급 효과
* **③ 본문**:
  - **누적 회원수**: 179만 명 (3040 자녀 동반 세대 98% 밀집)
  - **월간 활성 이용자 (MAU)**: 47만 명 (시즌 성수기 최고 68만 돌파)
  - **누적 앱 다운로드**: 241만 건 돌파
  - **등록 제휴점**: 전국 키즈카페, 숙소, 학습지 등 약 3만 개 제휴처 확보
* **④ KPI**: 캠페인 집행 시 최소 100만 명 이상의 정밀 타겟 바이어블 임프레션 확보
* **⑤ 표**: [주요 트래픽 메트릭] 구분, 수치, 연간 성장률, 타겟 밀집 비율 비교표
* **⑥ 추천 차트**: 회원 수 성장 그래프와 거래액 성장의 우상향 추이를 겹쳐 놓은 이중 축 혼합 차트
* **⑦ 인포그래픽 설명**: 플랫폼 핵심 지표 4가지를 대형 네온 박스 카드(2x2 Grid) 형태로 강조
* **⑧ Hero Image 설명**: 모던하고 깨끗하게 정돈된 북유럽풍 아이방에 자연광이 쏟아져 들어오고 교구들이 놓여 있는 모습
* **⑨ AI 이미지 생성 Prompt (영문)**: A minimalist Scandinavian styled kids playroom filled with high-end wooden creative toys, soft natural sunlight streaming through a large window, white clean walls, pastel-toned rug, commercial photography, premium Apple Keynote interior style, 8k. --ar 16:9
* **⑩ Negative Prompt**: text, watermark, messy objects, dark rooms.
* **⑪ PPT / Figma 레이아웃**: 좌측 50% 2x2 메트릭 카드 카드 레이아웃, 우측 50% 북유럽 감성의 아동 교육 공간 Hero Image 카드
* **⑫ Figma 레이아웃**: Flex wraps, Auto-layout cards with 1px border stroke
* **⑬ 추천 아이콘**: 👥 (회원 규모), 📥 (다운로드)
* **⑭ 컬러**: Sky Blue (#38BDF8), Ocean Blue (#0284C7), Deep Navy (#0B0D19)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 34px, Light 14px)
* **⑯ 발표 멘트**: "대한민국에서 아이를 키우는 30대, 40대 부모 2명 중 1명은 놀이의발견에 가입하여 서비스를 사용하고 있습니다."
* **⑰ CTA**: [놀이의발견 분기별 트래픽 성적표 열람]
* **Image Concept**: Modern Aesthetic Childhood Space
* **Camera Angle**: Low Angle, Wide Shot
* **Lighting**: Bright daylight, volumetric sunbeams
* **Mood**: Pure, Clean, Educational, Aesthetic
* **Composition**: Room corner perspective guiding attention to toys
* **Aspect Ratio**: 16:9

---

### 📄 Page 5: 고객 생생 후기 (User Voice)
* **① 제목**: 진성 유저들의 생생한 목소리가 입증하는 가치
* **② 핵심 메시지**: 예약 결제부터 오프라인 현장 이용까지의 높은 만족도 피드백
* **③ 본문**:
  - **ymhymk 회원 (36세, 경기 수원)**: "애들과 주말에 뭐할까 고민될 때 놀발 하나면 숙소 예약부터 체험학습 신청까지 한번에 해결되어 편리해요."
  - **세린채린맘 회원 (41세, 서울 강남)**: "주변 키즈카페 딜이나 숙박 특가 알림 푸시가 정교해서 실제로 결제를 제일 많이 유도하는 앱입니다."
* **④ KPI**: 앱스토어 평점 평균 4.8점 / 5.0점 만점 기록
* **⑤ 표**: [주요 후기 키워드 분석] 키워드(편리함, 특가, 정확성), 언급 빈도, 긍정 피드백 비율 요약표
* **⑥ 추천 차트**: 유저들의 긍정 피드백 요인 비율을 입체적으로 쪼개 보여주는 도넛 차트
* **⑦ 인포그래픽 설명**: 실제 유저의 아이디와 프로필 이미지를 활용한 말풍선 배치 도식
* **⑧ Hero Image 설명**: 햇살이 잘 드는 아늑한 거실 소파에서 30대 한국인 엄마와 어린 딸이 다정하게 태블릿 PC를 보며 웃고 있는 모습
* **⑨ AI 이미지 생성 Prompt (영문)**: A premium commercial photo of a warm Korean mother and her young daughter laughing joyfully together while looking at a tablet in a bright minimal white living room, soft natural morning light, organic linen shirts, corporate lifestyle style, high detail, 8k. --ar 16:9
* **⑩ Negative Prompt**: text, handwriting, real hand holding tablet, bad faces.
* **⑪ PPT 레이아웃**: 좌측 45% 유저 생생 말풍선 피드백 2종, 우측 55% 모녀 소파 다정 컷 카드
* **⑫ Figma 레이아웃**: Chat bubble components, borders dashed line
* **⑬ 추천 아이콘**: 💬 (유저 피드백), ⭐ (만족도)
* **⑭ 컬러**: Emerald Green (#10B981), Pure White (#FFFFFF), Warm Gray (#F3F4F6)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 32px, Regular 14px)
* **⑯ 발표 멘트**: "이용자들은 광고를 스팸이 아니라 주말 여가 계획을 짤 수 있는 유용한 정보 딜로 받아들이고 있습니다."
* **⑰ CTA**: [실제 광고주 집행 성공 스토리 보러가기]
* **Image Concept**: Warm Emotional Parent-Child Moment
* **Camera Angle**: Close-up, Soft Focus Portrait
* **Lighting**: Diffused Soft Sunlight, Backlit
* **Mood**: Warm, Emotional, Joyful, Sincere
* **Composition**: Golden triangle composition of faces and screen
* **Aspect Ratio**: 16:9

---

### 📄 Page 6: 광고 집행 제휴 기대 효과 (Expected Outcomes)
* **① 제목**: 놀이의발견 광고 제휴 기대 효과
* **② 핵심 메시지**: 정밀 타겟 도달과 높은 클릭 효율을 통한 브랜드 인지도 및 매출 수직 상승
* **③ 본문**:
  - **브랜드 인지도 상승**: 3040 육아 패밀리 타겟 인지도 대비 180% 성장 효과 기대
  - **클릭 유입량 증대**: 인덱스 세그먼트 발송 시 일반 포털 배너 대비 CTR 최대 1.5배 증가
  - **구매 전환 극대화**: 장바구니 방치 유저 핀포인트 매칭 시 평균 CVR 12% 보장
* **④ KPI**: 광고주 평균 ROAS 350% 이상 보장
* **⑤ 표**: [타겟층 도달 비교] 매체 종류, 타겟 도달율, 광고 클릭 효율 비교표
* **⑥ 추천 차트**: 타 매체 대비 놀이의발견 배너 집행 시 ROAS 성장 격차를 보여주는 대비 바 차트
* **⑦ 인포그래픽 설명**: 광고비 100만 원 투자 시 타 매체 대비 4배 이상의 유효 결제액을 복구하는 깔끔한 금액 퍼널 흐름
* **⑧ Hero Image 설명**: 성공적인 매출 상승을 상징하는 황금빛 코인들과 반투명한 우상향 유리 화살표의 고급 렌더링
* **⑨ AI 이미지 생성 Prompt (영문)**: A luxury abstract rendering of warm golden spheres and transparent glass arrow pointing upwards, clean warm lighting, minimal white background, elegant studio style, Apple Keynote presentation graphics, 8k. --ar 16:9
* **⑩ Negative Prompt**: text, dirty shadows, cartoon, bad details.
* **⑪ PPT 레이아웃**: 좌측 40% 성공 사례 요약 데이터, 우측 60% ROI 성장 추이 도식 카드
* **⑫ Figma 레이아웃**: Corner radius 32px Cards with dropshadow blur 20px
* **⑬ 추천 아이콘**: 💸 (매출 회수), 🏆 (성공 케이스)
* **⑭ 컬러**: Gold (#D97706), Teal Blue (#14B8A6)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 32px, Regular 14px)
* **⑯ 발표 멘트**: "단순 노출이 아닙니다. 실제 작년 패밀리 숙박 브랜드 B사는 광고비 대비 4.5배의 예약을 현장에서 끌어냈습니다."
* **⑰ CTA**: [업종별 맞춤형 성공사례 백서 다운로드]
* **Image Concept**: Symbolic Financial and ROI Growth
* **Camera Angle**: Close-up, Isometric perspective
* **Lighting**: Diffused Warm Light with Glass Caustics Reflections
* **Mood**: Success, Premium, Clean
* **Composition**: Diagonal golden flow of elements leading eyes upwards
* **Aspect Ratio**: 16:9

---

### 📄 Page 7: 광고 상품 소개
* **① 제목**: 6대 핵심 인벤토리와 전략적 맞춤 패키지 설계
* **② 핵심 메시지**: 앱 진입부터 상세 결제 완료까지 퍼널의 모든 단계에 침투
* **③ 본문**:
  - **스플래쉬 광고**: 앱 인트로 전체 화면 독점 노출 (인트로 구좌, 주 490만 원)
  - **메인 팝업 배너**: 홈 진입 즉시 전면 오버레이 팝업 (가시성 최고, 월 200만 원)
  - **메인 배너 광고**: 홈 화면 최상단 메인 롤링 (클릭 극대화, 월 350만 원)
  - **카테고리 GNB**: 관심사 매칭 퀵 아이콘 배치 (관심 타겟 GNB, 월 175만 원)
  - **메인 서브 배너**: 스크롤 피드 사이 중간 띠배너 (네이티브 노출, 월 105만 원)
  - **카테고리 상세**: 상품 정보 상세 페이지 하단 연동 (최종 결제 유도, 월 70만 원)
* **④ KPI**: 인벤토리 통합 총 2,800만 임프레션 보장
* **⑤ 표**: [인벤토리 단가 및 효율성 사양표] 구좌명, 노출 지면, 예상 CTR, 가격 일목요연 정리
* **⑥ 추천 차트**: 각 상품별 예상 전환율과 가격 대비 가치(Cost-Value)를 비교한 버블 차트
* **⑦ 인포그래픽 설명**: 놀이의발견 앱 메인 화면 Mockup 상에 각 6대 광고 구좌가 매핑된 구조도
* **⑧ Hero Image 설명**: 모던하고 투명한 아크릴 레이어들이 정밀하게 층층이 쌓여 있고 은은한 조명이 틈새로 흘러나오는 3D 구조물
* **⑨ AI 이미지 생성 Prompt (영문)**: A conceptual premium 3d structure of clean rectangular white and glass layers stack, warm lighting glowing between sheets, minimal layout, Apple slides graphic style, 8k resolution. --ar 16:9
* **⑩ Negative Prompt**: text, cheap plastics, dark mood.
* **⑪ PPT 레이아웃**: 좌측 50% 6대 인벤토리 핵심 단가표, 우측 50% 앱 내부 레이아웃 구조 도식 및 이미지
* **⑫ Figma 레이아웃**: Autolayout horizontal group, inner shadow
* **⑬ 추천 아이콘**: 📊 (인벤토리), 🧱 (구조도)
* **⑭ 컬러**: Clean Violet (#8B5CF6), Glass Blue (#3B82F6)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 32px, Regular 14px)
* **⑯ 발표 멘트**: "예산과 타겟팅 정밀도에 맞춰 가장 적절한 지면을 골라 믹스 매치해 드립니다."
* **⑰ CTA**: [6대 인벤토리 단가표 PDF로 일괄 다운로드]
* **Image Concept**: Structure Layer and Hierarchy
* **Camera Angle**: Symmetrical Isometric View
* **Lighting**: Elegant side glow illuminating edges
* **Mood**: Structural, Clear, Clean, Innovative
* **Composition**: Centered block stack with clean margin edges
* **Aspect Ratio**: 16:9

---

### 📄 Page 8: 광고상품 ① - 스플래쉬 광고 (Splash AD)
* **① 제목**: 앱 진입 100% 강제 노출, 임팩트형 인트로 스플래쉬
* **② 핵심 메시지**: 앱 실행 시 3초간 풀스크린 단독 노출로 단기간 각인 효과 극대화
* **③ 본문**:
  - **노출 방식**: 앱 최초 실행 시 3초간 인트로 단독 전면 화면 노출 (스킵 불가 단독 구좌)
  - **추천 업종**: 브랜드 론칭 캠페인, 성수기 시즌 이슈가 큰 대형 워터파크/호텔/리조트/지자체 축제 광고주
  - **기대 효율**: 평균 CTR **15% ~ 25%** | 평균 CVR **12% ~ 25%**
  - **정가 및 판매가**: 주당 700만 원 ➔ **특별 제안가 주 490만 원** (독점 점유)
* **④ KPI**: 주간 집행 시 유효 타겟 도달 임프레션 최소 50만 명 이상 절대 보장
* **⑤ 표**: [스플래쉬 광고 정책 요약] 집행 기간, 예상 노출 수, 예상 클릭 수, 할인 단가표
* **⑥ 추천 차트**: 일반 배너 대비 스플래쉬 광고 집행 시의 주목도 및 반응 속도 성장 수직 바 차트
* **⑦ 인포그래픽 설명**: 앱 진입 ➔ 3초 풀스크린 ➔ 홈 메인 이동으로 이어지는 3단계 레이어 모션 도식
* **⑧ Hero Image 설명**: 세련된 다크 블루 스튜디오 중앙에 은은하게 유리가 반짝이며 공중에 둥둥 떠 있는 모던한 스마트폰 프레임
* **⑨ AI 이미지 생성 Prompt (영문)**: A clean minimalist mock-up of a modern frameless smartphone floating in a dark navy blue studio room, glossy glass texture reflection, soft neon red and white neon backlight, luxury, Apple style presentation element, 8k. --ar 16:9
* **⑩ Negative Prompt**: text, hand holding phone, low quality, cheap.
* **⑪ PPT 레이아웃**: 좌측 45% 광고 상품 설명 및 요약표, 우측 55% 가상의 모바일 구동 Mockup 카드
* **⑫ Figma 레이아웃**: Mobile layout frame container, glow effects
* **⑬ 추천 아이콘**: 📱 (스마트폰), ⚡ (임팩트)
* **⑭ 컬러**: Electric Red (#EF4444), Dark Indigo (#1E1B4B)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 32px, Regular 14px)
* **⑯ 발표 멘트**: "이 지면은 앱을 켜는 모든 회원에게 첫 화면으로 3초간 노출되는 가장 임팩트가 큰 구좌입니다."
* **⑰ CTA**: [스플래쉬 집행 가능 잔여 일정 확인하기]
* **Image Concept**: Futuristic Floating Smartphone (Splash Concept)
* **Camera Angle**: Slightly tilted from front, dramatic angle
* **Lighting**: Deep Neon Backlight (Red/Cyan) casting soft ambient glow
* **Mood**: High-tech, Premium, Impactful
* **Composition**: Center aligned phone mockup with floating glass cards
* **Aspect Ratio**: 16:9

---

### 📄 Page 9: 광고상품 ② - 메인 팝업 배너 (Main Popup Banner)
* **① 제목**: 가성비 최강의 전환 지면, 홈 전면 메인 팝업 배너
* **② 핵심 메시지**: 홈 화면 진입 즉시 전면 오버레이 팝업 노출로 쿠폰/프로모션 즉각 참여 유도
* **③ 본문**:
  - **노출 방식**: 앱 홈 화면 진입 시 중앙 레이어로 노출되는 오버레이 형태의 팝업 광고
  - **추천 업종**: 외식, 프랜차이즈, 선착순 할인 쿠폰 프로모션, 단기간 집객이 필요한 키즈카페/체험전 광고주
  - **기대 효율**: 평균 CTR **10% ~ 15%** | 평균 CVR **12% ~ 15%**
  - **정가 및 판매가**: 월 350만 원 ➔ **특별 제안가 월 200만 원** (고정 롤링)
* **④ KPI**: 월간 집행 시 클릭 유입량 최소 3만 건 이상 보장
* **⑤ 표**: [메인 팝업 클릭 효율 지표] 집행 주차별 예상 노출수, 평균 클릭수, 잔여 구좌 비교표
* **⑥ 추천 차트**: 일반 배너 대비 전면 팝업 광고의 클릭 전환율(CVR) 격차를 비교한 수평 누적 막대 차트
* **⑦ 인포그래픽 설명**: 중앙 팝업 레이아웃 및 '오늘 하루 보지 않기' 닫기 버튼이 구조화된 UI 설명 카드
* **⑧ Hero Image 설명**: 모던한 폰 화면 위로 맑고 투명한 유리 카드가 공중에 가볍게 소 떠올라 있고, 손가락 끝이 화면을 가리키는 3D 그래픽
* **⑨ AI 이미지 생성 Prompt (영문)**: A minimal close-up shot of a clean Korean female finger touching a glowing smartphone screen displaying a bright abstract application layout, background is glassmorphic workspace, soft studio lighting, ultra-realistic, 8k. --ar 16:9
* **⑩ Negative Prompt**: text, hand writing, dark background, low quality.
* **⑪ PPT 레이아웃**: 좌측 40% 팝업 지면 상세 스펙, 우측 60% 투명 유리 레이아웃 3D 카드형 배치
* **⑫ Figma 레이아웃**: Glassmorphism cards layout, outer border-color transparent
* **⑬ 추천 아이콘**: 🎁 (쿠폰/프로모션), 🖱️ (클릭/전환)
* **⑭ 컬러**: Cyber Violet (#7C3AED), Bright Mint (#10B981)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 32px, Medium 15px)
* **⑯ 발표 멘트**: "이 지면은 단기간에 프로모션 참여를 이끌어내는 데 가장 효율적인 구좌입니다."
* **⑰ CTA**: [메인 팝업 집행 가이드 다운로드]
* **Image Concept**: Touch and Interact (Interaction Concept)
* **Camera Angle**: Macro Close-up
* **Lighting**: Subtle Warm Underlighting from screen
* **Mood**: Responsive, High detail, Minimal, Interactive
* **Composition**: Dynamic diagonal finger direction pointing to screen
* **Aspect Ratio**: 16:9

---

### 📄 Page 10: 광고상품 ③ - 메인 배너 광고 (Main Banner)
* **① 제목**: 지속적인 대규모 트래픽 확보, 홈 최상단 메인 배너
* **② 핵심 메시지**: 홈 화면 최상단 상시 노출 롤링 구좌로 안정적인 브랜드 인지도 빌딩
* **③ 본문**:
  - **노출 방식**: 홈 최상단 노출 롤링 배너 슬라이드 (가장 넓은 타겟 커버리지 확보)
  - **추천 업종**: 아동 도서/교재 브랜드, 대형 패키지 상품, 상시 브랜딩 노출이 지속적으로 필요한 대기업 광고주
  - **기대 효율**: 평균 CTR **3.5% ~ 5%** | 평균 CVR **10% ~ 12%**
  - **정가 및 판매가**: 월 500만 원 ➔ **특별 제안가 월 350만 원**
* **④ KPI**: 월간 집행 시 브랜드 노출 수 300만 임프레션 이상 확보 보장
* **⑤ 표**: [메인 배너 성과 사양] 구좌 위치, 롤링 주기, 예상 노출, 월 가격비교 종합표
* **⑥ 추천 차트**: 집행 기간 경과에 따른 누적 노출수 및 클릭수의 완만한 성장 곡선 그래프 차트
* **⑦ 인포그래픽 설명**: 메인 홈 상단 스크롤과 페이지네이션 도트 인디케이터가 매핑된 구조도
* **⑧ Hero Image 설명**: 새하얀 방 안에 모던한 파스텔톤 블록들이 유기적인 곡선 형태로 나열되어 있는 모던 이미지
* **⑨ AI 이미지 생성 Prompt (영문)**: A clean minimalist composition of white stone domino blocks curves on a pure white surface, soft shadows, warm spotlight from side, high detail, high-end Apple presentation style, 8k. --ar 16:9
* **⑩ Negative Prompt**: text, watermark, messy objects, complex colors.
* **⑪ PPT 레이아웃**: 상단 40% 핵심 브랜딩 메세지 및 단가, 하단 60% 롤링 배너 시각화 디자인 영역
* **⑫ Figma 레이아웃**: Horizontal auto-layout sliders, card components
* **⑬ 추천 아이콘**: 🖼️ (배너 지면), 🔄 (롤링 순환)
* **⑭ 컬러**: Pale Teal (#2DD4BF), Dark Charcoal (#1E293B)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 32px, Regular 14px)
* **⑯ 발표 멘트**: "이 배너는 앱에 접속하는 유저가 스크롤을 내리기 전에 가장 먼저 마주하는 브랜딩 지면입니다."
* **⑰ CTA**: [메인 배너 구좌 예약 현황판 보기]
* **Image Concept**: Curving Sequential Blocks (Rolling Concept)
* **Camera Angle**: High Angle Isometric
* **Lighting**: Soft side window light creating gentle shadows
* **Mood**: Flowing, Sequential, Ordered, Elegant
* **Composition**: Curved diagonal path of blocks across the frame
* **Aspect Ratio**: 16:9

---

### 📄 Page 11: 광고상품 ④ - 카테고리 GNB 퀵 광고 (Category GNB)
* **① 제목**: 관심사 타겟 직접 매칭, 카테고리 GNB 퀵 광고
* **② 핵심 메시지**: 홈 GNB 상단 관심 카테고리 퀵 아이콘 로고 노출로 관련성 높은 진성 유저 포착
* **③ 본문**:
  - **노출 방식**: 홈 화면 최상단 관심 카테고리 아이콘 영역에 브랜드 로고 및 엠블럼 상시 배치
  - **추천 업종**: 특정 분야(체험학습 전용 교재, 특정 리조트 브랜드, 키즈카페 등)에 특화된 카테고리 맞춤 광고주
  - **기대 효율**: 평균 CTR **2.8% ~ 4%** | 평균 CVR **9% ~ 10%**
  - **정가 및 판매가**: 월 250만 원 ➔ **특별 제안가 월 175만 원** (월단위 독점 노출)
* **④ KPI**: 타겟팅 카테고리 진입 회원 도달률 90% 이상 보장
* **⑤ 표**: [카테고리별 매치 매트릭스] 카테고리 종류(교육, 레저, 숙박), 매칭 강도, 월간 트래픽 규모 요약
* **⑥ 추천 차트**: 일반 포털 배너 광고 대비 카테고리 타겟팅 시의 CVR 효율 상승을 비교하는 방사형 차트
* **⑦ 인포그래픽 설명**: 카테고리 필터 선택 ➔ 타겟 카테고리 퀵 링크 ➔ 상세 페이지 연결 구조
* **⑧ Hero Image 설명**: 모던하고 추상적인 3D 막대그래프들이 반투명한 푸른빛과 붉은빛 조명을 받아 입체적으로 정렬된 모습
* **⑨ AI 이미지 생성 Prompt (영문)**: A high-end minimalist graphic representation of clean rising line charts and bar graphs, glassmorphic card ui overlay, soft blue and red glow backdrop, minimal white setting, commercial product design style, 8k. --ar 16:9
* **⑩ Negative Prompt**: text, dark shadows, cheap plastics.
* **⑪ PPT 레이아웃**: 좌측 50% 카테고리 타겟팅 효율 데이터, 우측 50% 퀵 엠블럼 연결 구조의 모식도 카드
* **⑫ Figma 레이아웃**: Grid items 4 columns, rounded corners 16px, padding 20px
* **⑬ 추천 아이콘**: 🏷️ (카테고리), 🎯 (정밀 타겟)
* **⑭ 컬러**: Cool Slate Blue (#475569), Violet Blue (#4F46E5)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 32px, Medium 14px)
* **⑯ 발표 멘트**: "관심사가 확실하게 검증된 카테고리 홈 진입 유저만 정밀 선별하여 광고주의 브랜드를 즉시 꽂아 드립니다."
* **⑰ CTA**: [카테고리별 상세 월간 트래픽 명세서 열람]
* **Image Concept**: Structured Performance Metrics (Targeting Concept)
* **Camera Angle**: Symmetrical Eye-level
* **Lighting**: Vibrant Underlighting with neon accents (Teal/Red)
* **Mood**: High-performing, Scientific, Clear, Reliable
* **Composition**: Dynamic balanced vertical elements aligned horizontally
* **Aspect Ratio**: 16:9

---

### 📄 Page 12: 광고상품 ⑤/⑥ - 서브 배너 & 카테고리 상세 배너
* **① 제목**: 스크롤 피드와 결제 페이지 속 네이티브 서브 배너 및 상세 배너
* **② 핵심 메시지**: 합리적 예산으로 피드 스크롤 도중 자연스럽게 브랜드를 각인시키는 효율형 지면
* **③ 본문**:
  - **메인 서브 배너**: 홈 화면 중간 스크롤 영역 피드 사이 가로형 슬림 띠배너 노출 (월 105만 원)
  - **카테고리 상세 배너**: 개별 상품 상세 정보 페이지 하단 고정 노출로 최종 구매 직전 전환 유도 (월 70만 원)
  - **기대 효율**: 평균 CTR **1.2% ~ 3%** | 평균 CVR **2.5% ~ 5%**
  - **추천 업종**: 캠핑용품, 패션, 리조트 단일 상품, 한정 예산으로 장기 브랜딩 노출이 요구되는 광고주
* **④ KPI**: 저렴한 비용 대비 유효 노출수 150만 임프레션 이상 확보
* **⑤ 표**: [서브/상세 배너 가성비 지표] 배너 분류, 월 가격, 예상 노출당 단가(CPM), 예상 CTR 비교
* **⑥ 추천 차트**: 가격 대비 효율성(임프레션당 단가) 측면에서 타 배너 대비 우위를 보여주는 누적 영역형 차트
* **⑦ 인포그래픽 설명**: 스크롤 피드 및 결제 상세 본문 사이 배너 위치를 매핑한 놀이의발견 UI 프레임워크 도식
* **⑧ Hero Image 설명**: 모던하고 깨끗한 유리 실린더 안에 은은하게 가득 차 올라 있는 황금색 입자들
* **⑨ AI 이미지 생성 Prompt (영문)**: A luxurious minimalist rendering of gold glowing sand rising inside three clean glass cylinder tubes of different heights, pure white background, commercial Apple slide style, 8k. --ar 16:9
* **⑩ Negative Prompt**: text, dark shadows, cheap plastics.
* **⑪ PPT 레이아웃**: 좌측 45% 두 가지 가성비 상품 비교 구조표, 우측 55% 네이티브 배너 배치 이미지 카드
* **⑫ Figma 레이아웃**: Dual horizontal layout cards, gap 16px, drop shadow
* **⑬ 추천 아이콘**: 📑 (네이티브 배너), 💡 (가성비)
* **⑭ 컬러**: Emerald Green (#10B981), Slate (#64748B)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 32px, Regular 14px)
* **⑯ 발표 멘트**: "예산 규모에 맞춰 메인 배너 대용으로 스크롤 하단에서 합리적인 단가로 지속 노출하기에 안성맞춤입니다."
* **⑰ CTA**: [가성비 광고 패키지 잔여 구좌 확인하기]
* **Image Concept**: Stepwise Volume Growth (Simulation Concept)
* **Camera Angle**: Front View
* **Lighting**: Brilliant Underlighting illuminating the gold dust
* **Mood**: High-performing, Clear, Reliable, Scientific
* **Composition**: Three steps vertical bars arrangement
* **Aspect Ratio**: 16:9

---

### 📄 Page 13: 제휴 문의 및 파트너십 안내 (Contact & Closing)
* **① 제목**: 3040 육아 가정으로의 관문, 놀이의발견 제휴
* **② 핵심 메시지**: 플랫폼통합기획팀의 전담 매니저가 귀사의 성장을 끝까지 지원합니다.
* **③ 본문**:
  - **담당 부서**: 웅진컴퍼스 플랫폼통합기획팀 최진호 과장
  - **이메일**: luckychoe22@wjcompass.com
  - **연락처**: 010-7166-3147
  - **본사 주소**: 서울특별시 서초구 강남대로39길 15-10 웅진컴퍼스 빌딩 3층
* **④ KPI**: 문의 접수 후 영업일 기준 24시간 이내 맞춤 광고 기획안 및 견적 회신
* **⑤ 표**: [주요 채널 문의처 안내] 광고 제휴, 입점 문의, 기술 지원 연락망 일목요연 정리
* **⑥ 추천 차트**: 문의 유형별 처리 속도와 만족도 지표를 보여주는 간단한 수평 막대 그래프
* **⑦ 인포그래픽 설명**: 본사 지도 약도 및 제휴 문의 메일 QR코드 박스
* **⑧ Hero Image 설명**: 오렌지-레드 톤의 깨끗한 그라데이션 바탕 중앙에 깔끔하게 인쇄된 봉투 형태의 화이트 3D 아이콘
* **⑨ AI 이미지 생성 Prompt (영문)**: A clean minimalist 3D rendering of white mail envelope icon floating in a pure red background, volumetric soft shadow, studio lighting, Apple design style, high resolution, 8k. --ar 16:9
* **⑩ Negative Prompt**: text, handwriting, real hand holding envelope, dark shadows.
* **⑪ PPT 레이아웃**: 좌측 50% 담당자 정보 및 지도, 우측 50% 오렌지-레드 메일 문의 카드
* **⑫ Figma 레이아웃**: Fixed width right card component, flexible left info grid
* **⑬ 추천 아이콘**: ✉️ (메일 전송), 📞 (다이렉트 콜)
* **⑭ 컬러**: Primary Crimson (#FF3B30), Pure White (#FFFFFF)
* **⑮ 폰트**: Outfit & Noto Sans KR (Bold 34px, Regular 14px)
* **⑯ 발표 멘트**: "이것으로 제안을 마치겠습니다. 24시간 언제든 편하게 연락 주시면 귀사에 특화된 광고 패키지를 제안 드리겠습니다. 감사합니다."
* **⑰ CTA**: [이메일로 빠른 단가표 문의하기]
* **Image Concept**: Abstract Direct Communication/Call to Action
* **Camera Angle**: Center Front View
* **Lighting**: Diffused Top-down Warm Studio Light
* **Mood**: Vibrant, Inviting, Professional, Minimalist
* **Composition**: Dynamic floating element in center space
* **Aspect Ratio**: 16:9`;

        const propData = await fetchAIWithFallback('/api/ai/proposal', 'POST', {
          clientName: '풀무원 키즈랜드', 
          previousContext: chainContext()
        }, proposalMockText);

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

        const roiMockText = `### 📈 AI 성과 분석 및 ROI 진단 리포트 (Fallback 시뮬레이션)
최근 캠페인에 대한 핵심 효율 지표 성적은 다음과 같습니다:
- **CTR**: **3.00%** (업계 평균: 2.0%) ➔ **양호**
- **CVR**: **9.38%** (업계 평균: 5.0%) ➔ **우수**
- **ROAS**: **300%** ➔ **매우 우수**
- **ROI**: **200%**, **공헌이익율**: **50.0%**
- **재계약 가능성 점수**: **85점 / 100점**

#### 🔍 종합 진단 및 분석 의견
1. **효율적인 유입 및 전환**: 클릭률(CTR)과 구매 전환율(CVR) 모두 양호한 수준을 보여주어, 마케팅 예산 대비 매출 기여도는 매우 우수합니다.`;

        const roiData = await fetchAIWithFallback('/api/ai/roi-report', 'POST', {
          partnerName: '뽀로로 파크',
          impressions: 120000,
          clicks: 3600,
          conversions: 450,
          spend: 1500000,
          revenue: 4500000,
          previousContext: chainContext()
        }, roiMockText, {
          calculated: {
            ctr: 3.00,
            cvr: 9.38,
            roas: 300,
            roi: 200,
            contributionMargin: 50.0,
            renewalScore: 85
          }
        });
        
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

  // ----------------------------------------------------
  // Dashboard Analytics & KPI Loader
  // ----------------------------------------------------
  const dashboardCharts = {};

  async function loadDashboardData() {
    try {
      const response = await fetch('/api/dashboard/stats');
      const resData = await response.json();
      if (!resData.success) return;

      const kpi = resData.kpi;
      const charts = resData.charts;

      // 1. KPI 카드 업데이트
      document.getElementById('kpi-total-advertisers').textContent = kpi.totalAdvertisers.toLocaleString();
      document.getElementById('kpi-ai-rec').textContent = kpi.aiRecommendedAdvertisers.toLocaleString();
      document.getElementById('kpi-high-score').textContent = kpi.highScoreAdvertisers.toLocaleString();
      document.getElementById('kpi-active-proposals').textContent = kpi.activeProposals.toLocaleString();
      document.getElementById('kpi-contracted').textContent = kpi.contractedAdvertisers.toLocaleString();
      document.getElementById('kpi-active-campaigns').textContent = kpi.activeCampaigns.toLocaleString();
      document.getElementById('kpi-monthly-revenue').textContent = (kpi.monthlyRevenue / 10000).toLocaleString() + '만원';
      document.getElementById('kpi-avg-ctr').textContent = kpi.avgCtr.toFixed(2) + '%';
      document.getElementById('kpi-avg-cvr').textContent = kpi.avgCvr.toFixed(2) + '%';
      document.getElementById('kpi-avg-roi').textContent = kpi.avgRoi + '%';
      document.getElementById('kpi-ending-campaigns').textContent = kpi.endingSoonCampaigns + '개';
      document.getElementById('kpi-renewal-rec').textContent = kpi.renewalRecommended + '개';
      document.getElementById('kpi-upsell-rec').textContent = kpi.upsellRecommended + '개';

      // 2. 차트 렌더링 헬퍼
      const renderChart = (canvasId, type, data, options) => {
        if (dashboardCharts[canvasId]) {
          dashboardCharts[canvasId].destroy();
        }
        const canvasEl = document.getElementById(canvasId);
        if (!canvasEl) return;
        const ctx = canvasEl.getContext('2d');
        dashboardCharts[canvasId] = new Chart(ctx, { type, data, options });
      };

      // Chart 1: 월별 광고 매출 추이 (Line)
      renderChart('chart-monthly-revenue', 'line', {
        labels: charts.monthlyRevenue.labels,
        datasets: [{
          label: '매출 (만원)',
          data: charts.monthlyRevenue.data,
          borderColor: '#00f2fe',
          backgroundColor: 'rgba(0, 242, 254, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      }, {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9aa0b9' } },
          x: { grid: { display: false }, ticks: { color: '#9aa0b9' } }
        }
      });

      // Chart 2: 광고상품별 매출 점유율 (Doughnut)
      renderChart('chart-product-revenue', 'doughnut', {
        labels: charts.productRevenue.labels,
        datasets: [{
          data: charts.productRevenue.data,
          backgroundColor: ['#3b82f6', '#a855f7', '#14b8a6', '#f97316'],
          borderWidth: 0
        }]
      }, {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#9aa0b9', font: { size: 9 } } }
        }
      });

      // Chart 3: 광고상품별 CTR (Bar)
      renderChart('chart-product-ctr', 'bar', {
        labels: charts.productPerformance.labels,
        datasets: [{
          label: '평균 CTR (%)',
          data: charts.productPerformance.ctr,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderRadius: 6
        }]
      }, {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9aa0b9' } },
          x: { grid: { display: false }, ticks: { color: '#9aa0b9' } }
        }
      });

      // Chart 4: 광고상품별 CVR (Bar)
      renderChart('chart-product-cvr', 'bar', {
        labels: charts.productPerformance.labels,
        datasets: [{
          label: '평균 CVR (%)',
          data: charts.productPerformance.cvr,
          backgroundColor: 'rgba(249, 115, 22, 0.8)',
          borderRadius: 6
        }]
      }, {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9aa0b9' } },
          x: { grid: { display: false }, ticks: { color: '#9aa0b9' } }
        }
      });

      // Chart 5: 카테고리별 광고주 분포 (Horizontal Bar)
      renderChart('chart-category-advertisers', 'bar', {
        labels: charts.categoryAdvertisers.labels,
        datasets: [{
          label: '광고주 수',
          data: charts.categoryAdvertisers.data,
          backgroundColor: 'rgba(234, 179, 8, 0.8)',
          borderRadius: 6
        }]
      }, {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9aa0b9' } },
          y: { grid: { display: false }, ticks: { color: '#9aa0b9' } }
        }
      });

      // Chart 6: 카테고리별 광고 성과 (Radar)
      renderChart('chart-category-performance', 'radar', {
        labels: charts.categoryPerformance.labels,
        datasets: [
          {
            label: 'CTR (%)',
            data: charts.categoryPerformance.ctr,
            borderColor: '#14b8a6',
            backgroundColor: 'rgba(20, 184, 166, 0.2)',
            borderWidth: 1
          },
          {
            label: 'CVR / 3 (%)',
            data: charts.categoryPerformance.cvr.map(v => v / 3),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderWidth: 1
          }
        ]
      }, {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(255, 255, 255, 0.05)' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            pointLabels: { color: '#9aa0b9', font: { size: 9 } },
            ticks: { display: false }
          }
        },
        plugins: {
          legend: { position: 'top', labels: { color: '#9aa0b9', font: { size: 9 } } }
        }
      });

      // Chart 7: 광고주 추천점수 분포 (Bar)
      renderChart('chart-score-distribution', 'bar', {
        labels: charts.scoreDistribution.labels,
        datasets: [{
          label: '광고주 수',
          data: charts.scoreDistribution.data,
          backgroundColor: '#ec4899',
          borderRadius: 6
        }]
      }, {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9aa0b9' } },
          x: { grid: { display: false }, ticks: { color: '#9aa0b9' } }
        }
      });

      // Chart 8: 광고계약 전환 퍼널 (Horizontal Bar)
      renderChart('chart-funnel-data', 'bar', {
        labels: charts.funnelData.labels,
        datasets: [{
          label: '건수/브랜드수',
          data: charts.funnelData.data,
          backgroundColor: '#2563eb',
          borderRadius: 6
        }]
      }, {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9aa0b9' } },
          y: { grid: { display: false }, ticks: { color: '#9aa0b9' } }
        }
      });

      // Chart 9: 재계약 가능성 분포 (Pie)
      renderChart('chart-renewal-distribution', 'pie', {
        labels: charts.renewalDistribution.labels,
        datasets: [{
          data: charts.renewalDistribution.data,
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 0
        }]
      }, {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#9aa0b9', font: { size: 9 } } }
        }
      });

    } catch (e) {
      console.error("Dashboard stats load error:", e);
    }
  }

  // 최초 로드 시 실행
  loadDashboardData();

});
