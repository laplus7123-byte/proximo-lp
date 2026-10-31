/* PRÓXIMO / ローカルLP。2026-10-31 ZIP修正版。 */
(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const { gsap, ScrollTrigger } = window;
  const canAnimate = Boolean(gsap && ScrollTrigger);
  const header = $('#site-header'), floating = $('#floating-line'), curriculum = $('#journey');
  let courseTrigger = null, courseStops = [], framePending = false, refreshTimer;
  if (canAnimate) gsap.registerPlugin(ScrollTrigger);

  function updateChrome() {
    framePending = false;
    const headerBottom = header.offsetHeight;
    header.classList.toggle('is-dark', $$('[data-dark]').some(section => {
      const r = section.getBoundingClientRect();
      return r.top <= headerBottom / 2 && r.bottom > headerBottom / 2;
    }));
    const r = curriculum.getBoundingClientRect();
    const overCourse = r.top < innerHeight * .8 && r.bottom > headerBottom;
    const show = $('#top').getBoundingClientRect().bottom < headerBottom && $('#contact').getBoundingClientRect().top >= innerHeight && !overCourse;
    floating.classList.toggle('is-visible', show);
    floating.setAttribute('aria-hidden', String(!show));
    floating.tabIndex = show ? 0 : -1;
  }
  function queueChrome() {
    if (!framePending) { framePending = true; requestAnimationFrame(updateChrome); }
  }
  addEventListener('scroll', queueChrome, { passive: true });
  addEventListener('resize', queueChrome, { passive: true });
  updateChrome();

  const opening = $('#opening');
  let openingTimeline, openingTimer, heroStarted = false;
  function animateHero() {
    if (heroStarted) return;
    heroStarted = true;
    if (!canAnimate || motion.matches) return;
    gsap.from('.hero-copy>*', { opacity: 0, y: 18, duration: .6, stagger: .09, ease: 'power2.out' });
    gsap.from('.hero-transform', { opacity: 0, duration: .8, delay: .25, ease: 'power2.out' });
  }
  function finishOpening() {
    if (opening.hidden) return;
    openingTimeline?.kill(); clearTimeout(openingTimer);
    const hadFocus = document.activeElement === opening;
    opening.hidden = true;
    if (hadFocus) $('.brand').focus({ preventScroll: true });
    animateHero();
  }
  let firstVisit = true;
  try { firstVisit = localStorage.getItem('proximo-lp-opening-v1') !== 'seen'; } catch (_) { /* optional */ }
  if (canAnimate && !motion.matches && (firstVisit || new URLSearchParams(location.search).has('opening'))) {
    opening.hidden = false;
    try { localStorage.setItem('proximo-lp-opening-v1', 'seen'); } catch (_) { /* optional */ }
    opening.addEventListener('click', finishOpening);
    addEventListener('keydown', event => { if (event.key === 'Escape') finishOpening(); });
    openingTimer = setTimeout(finishOpening, 1950);
    openingTimeline = gsap.timeline({ onComplete: finishOpening });
    openingTimeline.from('.opening-pitch', { scaleY: 0, duration: .5, transformOrigin: 'center top', ease: 'power2.out' }, 0)
      .from('.opening-ball', { x: -innerWidth / 2 - 100, rotation: -360, duration: .6, ease: 'back.out(.7)' }, .1)
      .from('.opening-brand', { opacity: 0, scale: .8, duration: .4, ease: 'back.out(1.6)' }, .55)
      .to(opening, { yPercent: -100, duration: .5, ease: 'power2.inOut' }, 1.2);
  } else { animateHero(); }

  const loop = $('.lecture-loops'), toggle = $('#marquee-toggle');
  toggle.addEventListener('click', () => {
    const paused = loop.classList.toggle('is-paused');
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.innerHTML = paused ? '画像の動きを再開する <span aria-hidden="true">▶</span>' : '画像の動きを止める <span aria-hidden="true">Ⅱ</span>';
  });
  // 動画URLの提供前は先頭へ移動せず、その場に準備中の案内を表示。
  $$('[data-video]').forEach(link => link.addEventListener('click', event => {
    if (link.getAttribute('href') !== '#') return;
    event.preventDefault();
    const notice = document.getElementById(link.getAttribute('aria-describedby'));
    if (notice) notice.hidden = false;
  }));
  $$('.faq-list details').forEach(details => {
    const summary = $('summary', details);
    let animation, targetOpen = details.open;
    summary.addEventListener('click', event => {
      if (motion.matches || !details.animate) return;
      event.preventDefault();
      const start = details.getBoundingClientRect().height;
      targetOpen = animation ? !targetOpen : !details.open;
      animation?.cancel();
      details.open = true;
      const end = targetOpen ? details.offsetHeight : summary.offsetHeight;
      details.style.overflow = 'hidden';
      animation = details.animate({ height: [`${start}px`, `${end}px`] }, { duration: 280, easing: 'ease-out' });
      animation.onfinish = () => {
        details.open = targetOpen; details.style.overflow = ''; animation = null;
        if (canAnimate) ScrollTrigger.refresh();
      };
      animation.oncancel = () => { details.style.overflow = ''; };
    });
    details.addEventListener('toggle', () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { if (canAnimate) ScrollTrigger.refresh(); }, 320);
    });
  });
  function countTo(element, delay = 0) {
    const raw = element.dataset.count, target = Number(raw), decimals = raw.includes('.') ? 1 : 0;
    const value = { n: 0 };
    gsap.to(value, { n: target, duration: 1.2, delay, ease: 'power2.out', onUpdate: () => {
      element.textContent = value.n.toLocaleString('ja-JP', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }, onComplete: () => { element.textContent = raw; } });
  }

  if (canAnimate) {
    const media = gsap.matchMedia();
    // FV: 表示位置と顔・ポーズを揃えた2枚を、上から下へワイプする。
    // スクロール量に直結し、戻す操作にも追従。短い画面とreduced-motionでは静止したスーツ姿。
    media.add('(min-height: 740px) and (prefers-reduced-motion: no-preference)', () => {
      const hero = $('#top'), stage = $('.hero-stage');
      hero.classList.add('hero-is-pinned');
      stage.dataset.phase = 'athlete';
      gsap.set(stage, { '--hero-cut': '100%', '--hero-progress': 0 });
      const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
        id: 'proximo-hero', trigger: stage,
        start: () => `top top+=${header.offsetHeight}`,
        end: () => `+=${Math.round(innerHeight * 1.45)}`,
        pin: true, scrub: .35, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: self => {
          stage.style.setProperty('--hero-progress', self.progress);
          stage.dataset.phase = self.progress < .52 ? 'athlete' : 'business';
          queueChrome();
        }
      } });
      tl.to({}, { duration: 1 }, 0)
        .fromTo(stage, { '--hero-cut': '100%' }, { '--hero-cut': '0%', duration: .72, immediateRender: true }, .12);
      return () => {
        hero.classList.remove('hero-is-pinned');
        stage.removeAttribute('data-phase');
        stage.style.removeProperty('--hero-cut');
        stage.style.removeProperty('--hero-progress');
        queueChrome();
      };
    });

    media.add('(prefers-reduced-motion: no-preference)', () => {
      const fade = { opacity: 0, y: 24, duration: .6, ease: 'power2.out' };
      $$('.reveal').forEach(element => gsap.from(element, { ...fade, scrollTrigger: { trigger: element, start: 'top 85%', once: true } }));
      ScrollTrigger.create({ trigger: '.stats', start: 'top 80%', once: true, onEnter: () => {
        $$('[data-count]').forEach((element, i) => countTo(element, i * .12));
        gsap.from('.stat', { opacity: 0, y: 24, duration: .5, stagger: .12 });
        $$('.donut-value').forEach((circle, i) => gsap.from(circle, { strokeDasharray: '0 100', duration: 1.2, delay: i * .12 }));
      } });
      $$('.feature-band').forEach(band => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: band, start: 'top 70%', once: true } });
        tl.from($('.feature-art', band), { opacity: 0, y: 45, duration: .8, ease: 'power2.out' })
          .from($$('.feature-copy>*', band), { ...fade, stagger: .1 }, .2);
      });
      $$('.support-item').forEach(item => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: item, start: 'top 85%', once: true } });
        tl.from($('.support-number', item), { ...fade }).from($('div', item), { ...fade }, .14);
      });
      gsap.from('.start-step', { opacity: 0, x: -24, duration: .5, stagger: .14, scrollTrigger: { trigger: '.start-steps', start: 'top 85%', once: true } });
      gsap.from('.faq-person', { ...fade, scrollTrigger: { trigger: '.faq-art', start: 'top 85%', once: true } });
      gsap.from('.faq-bubble', { opacity: 0, y: 12, duration: .5, delay: .15, scrollTrigger: { trigger: '.faq-art', start: 'top 85%', once: true } });
      gsap.from('.cta-person', { opacity: 0, x: 35, duration: .7, scrollTrigger: { trigger: '.final-cta', start: 'top 70%', once: true } });
      gsap.from('.final-copy h2', { ...fade, scrollTrigger: { trigger: '.final-cta', start: 'top 70%', once: true } });
      return () => {
        $$('[data-count]').forEach(el => { el.textContent = el.dataset.count; });
        finishOpening();
      };
    });
    // 講座カード: 下から入る次のカードを、残した前のカードの上へ積み重ねる。
    // 長いカードは全体を上へ送り、下端まで読んでから次のカードを入れる。
    media.add({ motion: '(prefers-reduced-motion: no-preference)', tall: '(min-height: 600px)',
      phone: '(max-width: 599px)', desktop: '(min-width: 1024px)' }, context => {
      if (!context.conditions.motion || !context.conditions.tall) return;
      const panels = $$('.course-panel'), links = $$('.course-navigation a');
      const stage = $('.course-stage');
      const gap = () => innerWidth < 600 ? 10 : 14;
      const cardTop = i => header.offsetHeight + 18 + i * gap();
      const readTravel = (panel, i) => Math.max(0, cardTop(i) + $('.course-panel-inner', panel).offsetHeight - (stage.clientHeight - 82));
      curriculum.classList.add('courses-pinned', 'courses-stacked');
      panels.forEach((panel, i) => {
        panel.style.setProperty('--stack-index', i);
        gsap.set(panel, { zIndex: i + 1, transformOrigin: '50% 0%', y: i ? () => stage.clientHeight + 50 : 0 });
      });
      function activate(index) {
        panels.forEach((panel, i) => { panel.setAttribute('aria-hidden', String(i !== index)); panel.inert = i !== index; });
        links.forEach((link, i) => { link.classList.toggle('is-active', i === index); if (i === index) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current'); });
      }
      activate(0);
      const timeline = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      const stops = [], changes = [], readEnds = [], transitions = [];
      let time = 0;
      const reading = stage.clientHeight * .52, entering = stage.clientHeight * .62;
      panels.forEach((panel, i) => {
        changes.push(time);
        // ナビは各カードの冒頭へ。小さい画面でも冒頭とボタンを順に読める。
        stops.push(time + reading * .25);
        const travel = readTravel(panel, i);
        // フォント読込・画面幅変更後にカードが伸びても、refresh時に再計算する。
        timeline.fromTo(panel, { y: 0 }, { y: () => -readTravel(panel, i), duration: Math.max(travel, stage.clientHeight * .18), immediateRender: false }, time + reading * .45);
        time += Math.max(travel, stage.clientHeight * .18);
        time += reading;
        readEnds.push(time - reading * .15);
        if (i < panels.length - 1) {
          const next = panels[i + 1];
          transitions.push([time, time + entering]);
          timeline.fromTo(next, { y: () => stage.clientHeight + 50 }, { y: 0, duration: entering, immediateRender: false }, time);
          // 既読カードを少し奥へ。透明に消さず、上辺を残す。
          for (let j = 0; j <= i; j++) {
            timeline.to(panels[j], { y: 0, scale: 1 - (i - j + 1) * .025, duration: entering }, time);
            timeline.to($('.course-panel-inner', panels[j]), { backgroundColor: j === i ? '#e5edf4' : '#d6e2ed', duration: entering }, time);
          }
          time += entering;
        }
      });
      timeline.to({}, { duration: time }, 0);
      courseStops = stops.map(t => t / time);
      // 読める最前面のカードのみフォーカス可能にする。
      const changePoints = changes.map((t, i) => (i ? t - entering * .35 : 0) / time);
      courseTrigger = ScrollTrigger.create({
        id: 'proximo-courses', trigger: stage, animation: timeline, start: 'top top', end: () => `+=${time}`,
        pin: true, scrub: .4, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: self => {
          let active = 0;
          changePoints.forEach((point, i) => { if (self.progress >= point) active = i; });
          activate(active); queueChrome();
        }
      });
      // QAとナビで同じ読書位置を参照。個別カードの高さに追従する。
      stage.dataset.courseStops = JSON.stringify(courseStops);
      stage.dataset.courseReadEnds = JSON.stringify(readEnds.map(t => t / time));
      stage.dataset.courseTransitions = JSON.stringify(transitions.map(pair => pair.map(t => t / time)));
      return () => {
        courseTrigger = null; courseStops = [];
        curriculum.classList.remove('courses-pinned', 'courses-stacked');
        delete stage.dataset.courseStops;
        delete stage.dataset.courseReadEnds;
        delete stage.dataset.courseTransitions;
        panels.forEach(panel => { panel.removeAttribute('aria-hidden'); panel.inert = false; panel.style.removeProperty('--stack-index'); });
        links.forEach(link => { link.removeAttribute('aria-current'); link.classList.remove('is-active'); });
        queueChrome();
      };
    });
  }
  $$('.course-navigation a').forEach((link, index) => link.addEventListener('click', event => {
    if (!courseTrigger) return;
    event.preventDefault();
    scrollTo({ top: courseTrigger.start + (courseTrigger.end - courseTrigger.start) * courseStops[index], behavior: 'smooth' });
  }));
  motion.addEventListener('change', () => { if (motion.matches) finishOpening(); queueChrome(); });
  document.fonts?.ready.then(() => { if (canAnimate) ScrollTrigger.refresh(); });
  addEventListener('load', () => { if (canAnimate) ScrollTrigger.refresh(); updateChrome(); });
})();
