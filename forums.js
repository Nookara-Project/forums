// Nookara Forums, the page. Everything a person wrote is put in with textContent / .src after checks, never as HTML. Icons are lucide.
(function () {
  'use strict';
  var API = '/forums/api';
  var TOKEN_KEY = 'nookara_forums_token';
  var app = document.getElementById('app');

  function L(key, en, vars) {
    var i = window.veloraI18n;
    if (i && i.has('forums.' + key)) return i.t('forums.' + key, vars);
    return vars ? en.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : en;
  }
  function h(tag, attrs) {
    var el = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.append(c.nodeType ? c : String(c));
  }
  function fill(el) { el.replaceChildren(); for (var i = 1; i < arguments.length; i++) add(el, arguments[i]); paint(); }
  function icon(name, cls) {
    var i = document.createElement('i');
    i.setAttribute('data-lucide', name);
    if (cls) i.setAttribute('class', cls);
    return i;
  }
  function paint() { if (window.lucide) window.lucide.createIcons({ attrs: {} }); }
  function iconBtn(name, title, onClick, cls) {
    return h('button', { type: 'button', class: 'icon-btn ' + (cls || ''), title: title, 'aria-label': title, onClick: onClick }, icon(name));
  }
  function btn(iconName, text, onClick, cls) {
    return h('button', { type: 'button', class: 'btn ' + (cls || ''), onClick: onClick }, iconName && icon(iconName), h('span', { text: text }));
  }
  function link(href, attrs) {
    var a = h('a', Object.assign({ href: href }, attrs || {}));
    a.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      e.preventDefault();
      go(href);
    });
    for (var i = 2; i < arguments.length; i++) add(a, arguments[i]);
    return a;
  }
  function lang() { var i = window.veloraI18n; return (i && i.locale) || undefined; }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleString(lang(), { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function fmtDay(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString(lang(), { month: 'long', day: 'numeric', year: 'numeric' });
  }
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (!(s >= 0)) return fmtDate(iso);
    var rtf = window.Intl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat(lang(), { numeric: 'auto', style: 'short' }) : null;
    if (!rtf) return fmtDate(iso);
    if (s < 60) return L('just_now', 'just now');
    if (s < 3600) return rtf.format(-Math.floor(s / 60), 'minute');
    if (s < 86400) return rtf.format(-Math.floor(s / 3600), 'hour');
    if (s < 2592000) return rtf.format(-Math.floor(s / 86400), 'day');
    return fmtDay(iso);
  }
  function num(n) { return Number(n || 0).toLocaleString(lang()); }
  function avatar(user, size) {
    var s = size || 32;
    var style = 'width:' + s + 'px;height:' + s + 'px';
    if (user && user.pfp && safeImage(user.pfp)) return h('img', { class: 'avatar', src: user.pfp, alt: '', style: style, loading: 'lazy' });
    return h('span', { class: 'avatar blank', style: style + ';font-size:' + Math.round(s * .45) + 'px', text: user ? String(user.username || '?').charAt(0).toUpperCase() : '?' });
  }
  function userLink(user, cls) {
    if (!user) return h('span', { class: 'who', text: L('deleted_user', 'Deleted user') });
    return link('/u/' + encodeURIComponent(user.username), { class: 'who ' + (cls || ''), text: user.username, style: user.color && /^#[0-9a-f]{6}$/i.test(user.color) ? 'color:' + user.color : null });
  }
  function tagStyle(color) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return null;
    var n = parseInt(color.slice(1), 16);
    var lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    return 'background:' + color + ';color:' + (lum > 140 ? '#111' : '#fff');
  }
  function tagChips(tags, hrefFor) {
    if (!tags || !tags.length) return null;
    return h('span', { class: 'tags' }, tags.map(function (t) { return link(hrefFor(t), { class: 'tag', style: tagStyle(t.color), text: t.name }); }));
  }
  var searchTag = function (t) { return '/search?tag=' + esc(t.name); };
  function tagPicker(all, current) {
    var on = {};
    (current || []).forEach(function (t) { on[t.id] = true; });
    var box = h('div', { class: 'tags tag-picker' });
    function draw() {
      fill(box, all.map(function (t) {
        var active = !!on[t.id];
        return h('button', { type: 'button', class: 'tag' + (active ? ' on' : ' off'), style: active ? tagStyle(t.color) : 'color:' + t.color + ';border-color:' + t.color, 'aria-pressed': active ? 'true' : 'false', text: t.name, onClick: function () {
          if (!active && Object.keys(on).length >= 3) { toast(errorText('too_many_topic_tags'), true); return; }
          if (active) delete on[t.id]; else on[t.id] = true;
          draw();
        } });
      }));
    }
    draw();
    return { el: box, value: function () { return Object.keys(on); } };
  }
  function communityIcon(c, cls) {
    if (c.icon && safeImage(c.icon)) return h('img', { class: cls, src: c.icon, alt: '', loading: 'lazy' });
    return h('span', { class: cls, text: String(c.name || c.slug || '?').charAt(0).toUpperCase() });
  }

  function token() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
  function setToken(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {  } }
  var ERRORS = {
    new_account_probation: ['err.probation', 'New accounts can read and report for now, but can\'t post yet. You can write once your account is a little older.'],
    birthday_required: ['err.birthday', 'Add your birthday in your Nookara account settings to post here.'],
    under_minimum_age: ['err.under_age', 'You don\'t meet the minimum age to post here.'],
    banned_from_forums: ['err.banned_all', 'You\'re banned from posting on Nookara Forums.'],
    banned_from_community: ['err.banned', 'You\'re banned from this community.'],
    title_too_short: ['err.title_short', 'That title is too short.'],
    title_too_long: ['err.title_long', 'That title is too long.'],
    body_empty: ['err.body_empty', 'Write something first.'],
    body_too_long: ['err.body_long', 'That\'s too long for one post.'],
    too_many_images: ['err.images', 'That\'s too many pictures for one post.'],
    signature_too_long: ['err.sig_long', 'That signature is too long.'],
    signature_too_many_lines: ['err.sig_lines', 'Signatures can only be a few lines.'],
    bad_slug: ['err.slug', 'Addresses use 3 to 32 lowercase letters, numbers, dashes or underscores.'],
    slug_taken: ['err.slug_taken', 'A community already has that address.'],
    reserved_name: ['err.reserved', 'That name is reserved.'],
    name_too_short: ['err.name_short', 'That name is too short.'],
    name_too_long: ['err.name_long', 'That name is too long.'],
    description_too_long: ['err.desc_long', 'That description is too long.'],
    rules_too_long: ['err.rules_long', 'Those rules are too long.'],
    bad_category: ['err.category', 'Pick a category.'],
    too_many_communities: ['err.too_many', 'You run as many communities as one account can.'],
    too_many_mods: ['err.too_many_mods', 'That\'s the most moderators a community can have.'],
    staff_only_community: ['err.staff_only', 'Only Nookara staff can post here.'],
    staff_only_category: ['err.staff_only_category', 'Only Nookara staff can use that category.'],
    posting_restricted: ['err.posting_restricted', 'Only people the owner picked can start topics here.'],
    replies_restricted: ['err.replies_restricted', 'Only people the owner picked can reply here.'],
    join_first: ['err.join_first', 'Join this community first.'],
    owner_cant_leave: ['err.owner_cant_leave', 'Hand this community over to someone before you leave.'],
    step_down_first: ['err.step_down_first', 'Step down as a moderator before you leave.'],
    too_many_allowed: ['err.too_many_allowed', 'That list is full.'],
    bad_tag: ['err.bad_tag', 'That tag isn\'t in this community.'],
    bad_tag_name: ['err.bad_tag_name', 'Tag names are 1 to 24 characters.'],
    bad_tag_color: ['err.bad_tag_color', 'Pick a colour for the tag.'],
    tag_taken: ['err.tag_taken', 'This community already has that tag.'],
    too_many_tags: ['err.too_many_tags', 'That\'s the most tags a community can have.'],
    too_many_topic_tags: ['err.too_many_topic_tags', 'A topic can have up to 3 tags.'],
    community_locked: ['err.community_locked', 'This community is read-only right now.'],
    topic_locked: ['err.topic_locked', 'This topic is locked.'],
    topic_closed: ['err.topic_closed', 'This topic is closed.'],
    rate_limited: ['err.rate', 'You\'re doing that a lot. Try again in a bit.'],
    user_not_found: ['err.user', 'There\'s nobody with that username.'],
    not_found: ['err.not_found', 'That isn\'t here any more.'],
    not_a_mod: ['err.not_mod', 'Only this community\'s moderators can do that.'],
    owner_only: ['err.owner', 'Only this community\'s owner can do that.'],
    not_yours: ['err.not_yours', 'That isn\'t yours to change.'],
    cant_act_on_them: ['err.cant_act', 'You can\'t do that to this person.'],
    thats_you: ['err.thats_you', 'That\'s you.'],
    already_owner: ['err.already_owner', 'They already own this community.'],
    already_reported: ['err.already_reported', 'You\'ve already reported this to the community.'],
    cant_report_yourself: ['err.report_self', 'You can\'t report yourself.'],
    author_gone: ['err.author_gone', 'The person who wrote this no longer has an account.'],
    category_in_use: ['err.category_in_use', 'Communities are still in that category.'],
    confirm_mismatch: ['err.confirm', 'That doesn\'t match.'],
    storage_limit_exceeded: ['err.storage', 'Your Nookara storage is full. Remove something or upgrade to Pro.'],
    upload_suspended: ['err.upload_suspended', 'Uploads are turned off on your account for now.'],
    file_too_big: ['err.file_big', 'Pictures can be up to 15 MB.'],
    not_an_image: ['err.not_image', 'That file isn\'t a picture we can use.'],
    insufficient_scope: ['err.scope', 'You turned off Upload Media when you signed in. Sign out and back in to allow pictures.'],
    tos_required: ['err.tos', 'Accept the latest Terms of Service on Nookara, then come back.'],
    account_suspended: ['err.suspended', 'Your account is suspended.'],
  };
  function errorText(code) {
    var e = ERRORS[code];
    return e ? L(e[0], e[1]) : L('err.generic', 'Something went wrong ({code}).', { code: code || 'network' });
  }
  function call(method, path, body) {
    var headers = token() ? { Authorization: 'Bearer ' + token() } : {};
    var init = { method: method, headers: headers };
    if (body instanceof FormData) init.body = body;
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
    return fetch(API + path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.ok) return j;
        if (r.status === 401 || j.error === 'forums_token_required' || j.error === 'origin_not_authorized') { setToken(null); S.me = null; renderTop(); }
        var e = new Error(j.error || 'http_' + r.status);
        e.code = j.error;
        e.extra = j;
        throw e;
      });
    });
  }
  var get = function (p) { return call('GET', p); };
  var esc = encodeURIComponent;

  var S = { me: null, cfg: { image_hosts: [], report_categories: [], limits: {} }, navOpen: false };

  var signingIn = false;
  function signIn() {
    if (signingIn) return;
    var w = window.open('about:blank', 'nookara_forums_login', 'width=900,height=800');
    signingIn = true;
    function done(e) {
      signingIn = false;
      if (e) toast(e === 'popup_blocked' ? L('signin.popup', 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.') : L('signin.failed', 'That didn\'t work. Try again.'), true);
    }
    var cfg = S.cfg;
    fetch('/auth/ext-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_id: cfg.app_id }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.code) throw new Error(j.error || 'no_code');
        if (!w) throw new Error('popup_blocked');
        w.location.href = cfg.site + '/login?' + new URLSearchParams({ code: j.code });
        var finished = false;
        var beat = setInterval(function () { if (!finished && w.closed) { finish(); done(); } }, 700);
        function finish() { finished = true; clearInterval(beat); window.removeEventListener('message', onMessage); }
        function onMessage(ev) {
          if (ev.origin !== cfg.site || !ev.data || ev.data.type !== 'nookara_app_grant' || ev.data.code !== j.code) return;
          finish();
          fetch('/auth/ext-code/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: j.code, grant: ev.data.grant }) })
            .then(function (r) { return r.json(); })
            .then(function (x) {
              if (!x.token) throw new Error(x.error || 'no_token');
              setToken(x.token);
              signingIn = false;
              return loadMe().then(renderFrame);
            })
            .catch(function (e) { done(e.message); });
        }
        window.addEventListener('message', onMessage);
      })
      .catch(function (e) { if (w) try { w.close(); } catch (x) {  } done(e.message); });
  }
  function signOut() { setToken(null); S.me = null; renderFrame(); }
  function loadMe() {
    if (!token()) return Promise.resolve();
    return get('/me').then(function (m) {
      S.me = m;
      applyAccent(m.color);
      if (window.veloraI18n) window.veloraI18n.fromAccount(m.lang);
    }).catch(function () {  });
  }
  function applyAccent(c) {
    if (!c || !/^#[0-9a-f]{6}$/i.test(c)) return;
    var n = parseInt(c.slice(1), 16);
    var st = document.documentElement.style;
    st.setProperty('--accent', c);
    st.setProperty('--accent-dim', 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',.12)');
    var lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    st.setProperty('--on-accent', lum > 110 ? '#16141c' : '#ffffff');
  }
  function blockText(b) {
    if (!b) return null;
    if (b.reason === 'new_account_probation') return L('block.probation', 'Your account is brand new, so you can read and report for now. You can post, vote and start communities from {when}.', { when: fmtDate(b.until) });
    return errorText(b.reason);
  }
  function needSignIn(fn) {
    return function () {
      if (!S.me) return signIn();
      if (S.me.write_block) return toast(blockText(S.me.write_block), true);
      return fn.apply(this, arguments);
    };
  }

  function safeImage(url) {
    try {
      var u = new URL(url, location.href);
      if (u.origin === location.origin && u.pathname.indexOf('/assets/') === 0) return true;
      return (u.protocol === 'https:' || u.protocol === 'http:' && /localhost/.test(u.hostname)) && S.cfg.image_hosts.indexOf(u.host.toLowerCase()) >= 0 && u.pathname.indexOf('/uploads/') === 0;
    } catch (e) { return false; }
  }
  function safeLink(url) {
    try { var u = new URL(url); return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null; } catch (e) { return null; }
  }
  function inline(text, depth) {
    var out = [];
    var re = /(!\[[^\]\n]*\]\([^)\s]+\))|(\[[^\]\n]+\]\([^)\s]+\))|(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(https?:\/\/[^\s<>()]+[^\s<>().,!?;:'"])/g;
    var last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(document.createTextNode(text.slice(last, m.index)));
      if (m[1]) {
        var im = /^!\[([^\]\n]*)\]\(([^)\s]+)\)$/.exec(m[1]);
        if (safeImage(im[2])) out.push(h('a', { href: im[2], target: '_blank', rel: 'noopener noreferrer' }, h('img', { src: im[2], alt: im[1] || '', loading: 'lazy' })));
        else if (safeLink(im[2])) out.push(h('a', { href: safeLink(im[2]), target: '_blank', rel: 'nofollow ugc noopener noreferrer', text: im[1] || im[2] }));
        else out.push(document.createTextNode(m[1]));
      } else if (m[2]) {
        var ln = /^\[([^\]\n]+)\]\(([^)\s]+)\)$/.exec(m[2]);
        var href = safeLink(ln[2]);
        out.push(href ? h('a', { href: href, target: '_blank', rel: 'nofollow ugc noopener noreferrer', text: ln[1] }) : document.createTextNode(m[2]));
      } else if (m[3]) out.push(h('code', { text: m[3].slice(1, -1) }));
      else if (m[4] && depth < 3) out.push(h('b', null, inline(m[4].slice(2, -2), depth + 1)));
      else if (m[5] && depth < 3) out.push(h('i', null, inline(m[5].slice(1, -1), depth + 1)));
      else if (m[6]) out.push(h('a', { href: m[6], target: '_blank', rel: 'nofollow ugc noopener noreferrer', text: m[6] }));
      else out.push(document.createTextNode(m[0]));
      last = re.lastIndex;
    }
    if (last < text.length) out.push(document.createTextNode(text.slice(last)));
    return out;
  }
  function blocks(text, into) {
    var lines = String(text).split('\n');
    var para = [], list = null;
    function flush() {
      if (para.length) { into.append(h('p', null, joinLines(para))); para = []; }
      list = null;
    }
    function joinLines(ls) {
      var out = [];
      ls.forEach(function (l, i) { if (i) out.push(h('br')); out.push(inline(l, 0)); });
      return out;
    }
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (/^```/.test(l)) {
        flush();
        var code = [];
        for (i++; i < lines.length && !/^```/.test(lines[i]); i++) code.push(lines[i]);
        into.append(h('pre', null, h('code', { text: code.join('\n') })));
      } else if (!l.trim()) flush();
      else if (/^#{1,3} /.test(l)) { flush(); into.append(h('h3', null, inline(l.replace(/^#+ /, ''), 0))); }
      else if (/^[-*] /.test(l)) {
        if (para.length) flush();
        if (!list) { list = h('ul'); into.append(list); }
        list.append(h('li', null, inline(l.slice(2), 0)));
      } else { if (list) list = null; para.push(l); }
    }
    flush();
  }
  function renderText(text, depth) {
    var root = h('div', { class: 'text' });
    var s = String(text);
    var open = /\[quote(?:=([^\]\n]{0,80}))?\]/i;
    var pos = 0;
    while (pos < s.length) {
      var rest = s.slice(pos);
      var m = open.exec(rest);
      if (!m) { blocks(rest, root); break; }
      if (m.index) blocks(rest.slice(0, m.index), root);
      var start = pos + m.index + m[0].length;
      var level = 1, at = start, tag = /\[quote(?:=[^\]\n]{0,80})?\]|\[\/quote\]/ig, t;
      tag.lastIndex = at;
      var end = -1;
      while ((t = tag.exec(s))) {
        if (t[0].charAt(1) === '/') { level--; if (!level) { end = t.index; break; } } else level++;
      }
      if (end < 0) { blocks(s.slice(pos + m.index), root); break; }
      root.append(quoteBlock(m[1], s.slice(start, end), depth || 0));
      pos = end + 8;
    }
    return root;
  }
  function quoteBlock(who, inner, depth) {
    var parts = /^([^#]*)(?:#(\d+))?$/.exec(who || '') || [];
    var name = (parts[1] || '').trim();
    var post = parts[2];
    var head = h('div', { class: 'quote-head' }, icon('quote'), name ? h('span', { text: L('quote.wrote', '{name} wrote:', { name: name }) }) : h('span', { text: L('quote.quote', 'Quote') }), post && h('a', { href: '#', title: L('quote.jump', 'Go to the post'), onClick: function (e) { e.preventDefault(); jumpToPost(post); } }, icon('arrow-up-right')));
    var box = h('blockquote', { class: 'quote' }, head);
    var body = depth >= 3 ? h('div', { class: 'meta', text: '...' }) : renderText(inner, depth + 1);
    var wrap = h('div', { class: 'quote-inner' }, body);
    box.append(wrap);
    if (inner.length > 500 || inner.split('\n').length > 8) {
      box.classList.add('folded');
      box.append(h('button', { type: 'button', class: 'quote-fold', text: L('quote.more', 'Read more'), onClick: function (e) { box.classList.remove('folded'); e.target.remove(); } }));
    }
    return box;
  }
  function jumpToPost(id) {
    var el = document.getElementById('p' + id);
    if (el) { el.scrollIntoView(); flash(el); return; }
    get('/posts/' + esc(id) + '/where').then(function (w) { go('/t/' + w.topic_id + '?page=' + w.page + '#p' + id); }).catch(function (e) { toast(errorText(e.code), true); });
  }
  function flash(el) { el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 1800); }

  var toastTimer;
  function toast(text, bad) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var t = h('div', { class: 'toast' + (bad ? ' bad' : ''), role: 'status', text: text });
    document.body.append(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, 4200);
  }
  function closeOverlays() { document.querySelectorAll('.overlay, .menu').forEach(function (x) { x.remove(); }); }
  function dialog(title) {
    closeOverlays();
    var box = h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    var over = h('div', { class: 'overlay', onMouseDown: function (e) { if (e.target === over) over.remove(); } }, box);
    box.append(h('h2', { text: title }));
    document.body.append(over);
    return { box: box, close: function () { over.remove(); } };
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeOverlays(); });
  function menu(anchor, items) {
    closeOverlays();
    var m = h('div', { class: 'menu', role: 'menu' });
    items.forEach(function (it) {
      if (!it) return;
      if (it.sep) { m.append(h('hr')); return; }
      if (it.href) { m.append(link(it.href, { onClick: closeOverlays }, icon(it.icon), h('span', { text: it.text }))); return; }
      m.append(h('button', { type: 'button', class: it.danger ? 'danger' : '', onClick: function () { closeOverlays(); it.on(); } }, icon(it.icon), h('span', { text: it.text })));
    });
    document.body.append(m);
    paint();
    var r = anchor.getBoundingClientRect();
    m.style.top = Math.min(r.bottom + 4, innerHeight - m.offsetHeight - 8) + 'px';
    m.style.left = Math.max(8, Math.min(r.right - m.offsetWidth, innerWidth - m.offsetWidth - 8)) + 'px';
    setTimeout(function () { document.addEventListener('click', function off(e) { if (!m.contains(e.target)) { m.remove(); } document.removeEventListener('click', off); }); });
  }
  function ask(title, opts) {
    var d = dialog(title);
    var msg = h('div', { class: 'err' });
    if (opts.intro) d.box.append(h('p', { class: 'meta', style: 'margin-bottom:12px', text: opts.intro }));
    var inputs = {};
    (opts.fields || []).forEach(function (f) {
      var el = f.kind === 'textarea' ? h('textarea', { maxlength: f.max, placeholder: f.placeholder, style: 'min-height:80px', value: f.value }) : h('input', { type: f.type || 'text', maxlength: f.max, placeholder: f.placeholder, value: f.value, min: f.min });
      inputs[f.name] = el;
      d.box.append(h('label', { class: 'field' }, h('span', { text: f.label }), el));
    });
    var go_ = h('button', { type: 'button', class: 'btn ' + (opts.danger ? 'danger' : 'primary'), text: opts.action, onClick: function () {
      var values = {};
      Object.keys(inputs).forEach(function (k) { values[k] = inputs[k].value; });
      go_.disabled = true;
      msg.textContent = '';
      Promise.resolve(opts.run(values)).then(function () { d.close(); }).catch(function (e) { go_.disabled = false; msg.textContent = errorText(e.code); });
    } });
    d.box.append(msg, h('div', { class: 'actions' }, go_, h('button', { type: 'button', class: 'btn', text: L('cancel', 'Cancel'), onClick: d.close })));
    paint();
    var first = d.box.querySelector('input, textarea');
    if (first) first.focus();
  }
  var CAT_TEXT = {
    'Underage': ['cat.underage', 'Someone under the minimum age'],
    'Threats or Real-World Harm': ['cat.threats', 'Threats or real-world harm'],
    'Doxxing / Personal Information': ['cat.doxxing', 'Doxxing or personal information'],
    'NSFW / Explicit Content': ['cat.nsfw', 'NSFW or explicit content'],
    'Graphic Violence / Gore': ['cat.gore', 'Graphic violence or gore'],
    'Malware / Phishing / Scam': ['cat.scam', 'Malware, phishing or a scam'],
    'Hate Speech / Harassment': ['cat.hate', 'Hate speech or harassment'],
    'Spam or Bot Activity': ['cat.spam', 'Spam or bot activity'],
    'Copyright / Intellectual Property Violation': ['cat.copyright', 'Copyright or intellectual property'],
    'Other': ['cat.other', 'Something else'],
  };
  function catLabel(c) { var e = CAT_TEXT[c]; return e ? L(e[0], e[1]) : c; }
  function reportDialog(post, community) {
    if (!S.me) return signIn();
    var d = dialog(L('report.title', 'Report this post'));
    var to = 'nookara';
    var choices = {};
    function choice(key, ic, title, sub) {
      var el = h('button', { type: 'button', class: 'choice', onClick: function () { to = key; sync(); } }, icon(ic), h('span', null, h('b', { text: title }), h('small', { text: sub })));
      choices[key] = el;
      return el;
    }
    function sync() { Object.keys(choices).forEach(function (k) { choices[k].classList.toggle('on', k === to); }); }
    var cat = h('select', null, h('option', { value: '', text: L('report.pick', 'Choose a reason') }), S.cfg.report_categories.map(function (c) { return h('option', { value: c, text: catLabel(c) }); }));
    var details = h('textarea', { maxlength: 2000, style: 'min-height:80px', placeholder: L('report.details_ph', 'Anything that helps (optional)') });
    var msg = h('div', { class: 'err' });
    var send = h('button', { type: 'button', class: 'btn primary', text: L('report.send', 'Send report'), onClick: function () {
      if (!cat.value) { msg.textContent = errorText('bad_category'); return; }
      send.disabled = true;
      call('POST', '/posts/' + post.id + '/report', { to: to, category: cat.value, details: details.value }).then(function () {
        d.close();
        toast(to === 'nookara' ? L('report.sent_nookara', 'Sent to Nookara staff. Thanks for telling us.') : L('report.sent_owner', 'Sent to this community\'s owner and moderators.'));
      }).catch(function (e) { send.disabled = false; msg.textContent = errorText(e.code); });
    } });
    d.box.append(
      choice('nookara', 'shield-alert', L('report.to_nookara', 'Report to Nookara'), L('report.to_nookara_sub', 'Nookara staff review it. For anything that breaks Nookara\'s rules.')),
      choice('community', 'users', L('report.to_owner', 'Report to Community Owner'), L('report.to_owner_sub', 'The owner and moderators of c/{slug} see it. For things that break this community\'s own rules.', { slug: community.slug })),
      h('label', { class: 'field', style: 'margin-top:10px' }, h('span', { text: L('report.reason', 'Reason') }), cat),
      h('label', { class: 'field' }, h('span', { text: L('report.details', 'Details') }), details),
      msg,
      h('div', { class: 'actions' }, send, h('button', { type: 'button', class: 'btn', text: L('cancel', 'Cancel'), onClick: d.close })));
    sync();
    paint();
  }
  function reportCommunityDialog(c) {
    if (!S.me) return signIn();
    var d = dialog(L('report.community_title', 'Report c/{slug} to Nookara', { slug: c.slug }));
    var cat = h('select', null, h('option', { value: '', text: L('report.pick', 'Choose a reason') }), S.cfg.report_categories.map(function (x) { return h('option', { value: x, text: catLabel(x) }); }));
    var details = h('textarea', { maxlength: 2000, style: 'min-height:80px' });
    var msg = h('div', { class: 'err' });
    var send = h('button', { type: 'button', class: 'btn primary', text: L('report.send', 'Send report'), onClick: function () {
      if (!cat.value) { msg.textContent = errorText('bad_category'); return; }
      send.disabled = true;
      call('POST', '/c/' + esc(c.slug) + '/report', { category: cat.value, details: details.value }).then(function () { d.close(); toast(L('report.sent_nookara', 'Sent to Nookara staff. Thanks for telling us.')); })
        .catch(function (e) { send.disabled = false; msg.textContent = errorText(e.code); });
    } });
    d.box.append(h('label', { class: 'field' }, h('span', { text: L('report.reason', 'Reason') }), cat), h('label', { class: 'field' }, h('span', { text: L('report.details', 'Details') }), details), msg,
      h('div', { class: 'actions' }, send, h('button', { type: 'button', class: 'btn', text: L('cancel', 'Cancel'), onClick: d.close })));
    paint();
  }

  // ── composer ──
  function composer(opts) {
    var ta = h('textarea', { maxlength: S.cfg.limits.body || 20000, placeholder: opts.placeholder || L('composer.placeholder', 'Write something...'), 'aria-label': L('composer.label', 'Your post'), value: opts.value });
    var preview = h('div', { class: 'preview hidden' });
    var file = h('input', { type: 'file', accept: 'image/*', class: 'hidden' });
    function wrap(a, b, ph) {
      var s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || ph || '';
      ta.setRangeText(a + sel + b, s, e, 'select');
      ta.focus();
    }
    function insert(text) {
      var s = ta.selectionStart;
      var before = ta.value.slice(0, s);
      var pad = before && !/\n\n$/.test(before) ? (/\n$/.test(before) ? '\n' : '\n\n') : '';
      ta.setRangeText(pad + text + '\n\n', s, ta.selectionEnd, 'end');
      ta.focus();
    }
    file.addEventListener('change', function () {
      var f = file.files[0];
      file.value = '';
      if (!f) return;
      toast(L('composer.uploading', 'Uploading your picture...'));
      uploadImage(f).then(function (url) { insert('![](' + url + ')'); toast(L('composer.uploaded', 'Picture added.')); }).catch(function (e) { toast(errorText(e.code), true); });
    });
    var previewing = false;
    var toolbar = h('div', { class: 'toolbar' },
      iconBtn('bold', L('composer.bold', 'Bold'), function () { wrap('**', '**', L('composer.bold', 'Bold')); }),
      iconBtn('italic', L('composer.italic', 'Italic'), function () { wrap('*', '*', L('composer.italic', 'Italic')); }),
      iconBtn('code', L('composer.code', 'Code'), function () { wrap('`', '`', 'code'); }),
      iconBtn('link', L('composer.link', 'Link'), function () { wrap('[', '](https://)', L('composer.link_text', 'link text')); }),
      iconBtn('list', L('composer.list', 'List'), function () { insert('- '); }),
      iconBtn('quote', L('composer.quote', 'Quote'), function () { wrap('[quote]', '[/quote]\n', ''); }),
      S.me && S.me.can_upload && iconBtn('image', L('composer.image', 'Add a picture'), function () { file.click(); }),
      file,
      h('span', { class: 'spacer' }),
      iconBtn('eye', L('composer.preview', 'Preview'), function () {
        previewing = !previewing;
        ta.classList.toggle('hidden', previewing);
        preview.classList.toggle('hidden', !previewing);
        if (previewing) { fill(preview, renderText(ta.value)); }
      }));
    ta.addEventListener('paste', function (e) {
      var f = e.clipboardData && e.clipboardData.files && e.clipboardData.files[0];
      if (!f || f.type.indexOf('image/') !== 0 || !S.me || !S.me.can_upload) return;
      e.preventDefault();
      uploadImage(f).then(function (url) { insert('![](' + url + ')'); }).catch(function (x) { toast(errorText(x.code), true); });
    });
    return { el: h('div', null, toolbar, ta, preview), ta: ta, insert: insert };
  }
  function uploadImage(file, kind) {
    var fd = new FormData();
    fd.append('file', file);
    return call('POST', '/upload' + (kind ? '?kind=' + kind : ''), fd).then(function (j) { return j.url; });
  }

  function go(href) {
    history.pushState(null, '', href);
    closeOverlays();
    S.navOpen = false;
    route();
  }
  window.addEventListener('popstate', route);
  var main, side;
  function renderFrame() {
    main = h('main', { class: 'main' });
    side = h('nav', { class: 'side' });
    fill(app, h('header', { class: 'top', id: 'top' }), h('div', { class: 'frame' }, side, main));
    renderTop();
    route();
  }
  function renderTop() {
    var top = document.getElementById('top');
    if (!top) return;
    var q = h('input', { type: 'search', placeholder: L('search.placeholder', 'Search Nookara Forums'), 'aria-label': L('search.label', 'Search'), value: new URLSearchParams(location.search).get('q') || '' });
    q.addEventListener('keydown', function (e) { if (e.key !== 'Enter' || !q.value.trim()) return;
      var v = q.value.trim();
      go(/^tag:/i.test(v) ? '/search?tag=' + esc(v.slice(4).trim()) : '/search?q=' + esc(v)); });
    var right;
    if (S.me) {
      var who = h('button', { type: 'button', class: 'btn', onClick: function (e) {
        menu(e.currentTarget, [
          { href: '/u/' + esc(S.me.username), icon: 'user', text: L('menu.profile', 'Your forum profile') },
          { href: '/settings', icon: 'settings', text: L('menu.settings', 'Signature') },
          { href: '/create', icon: 'plus', text: L('menu.create', 'Start a community') },
          S.me.staff && { href: '/manage', icon: 'shield', text: L('menu.staff', 'Forum staff tools') },
          { sep: true },
          { icon: 'log-out', text: L('menu.signout', 'Sign out'), on: signOut },
        ]);
      } }, avatar(S.me, 22), h('span', { class: 'label', text: S.me.username }), icon('chevron-down'));
      right = who;
    } else {
      right = btn('log-in', L('signin.button', 'Sign in'), signIn, 'primary');
    }
    fill(top,
      iconBtn('menu', L('menu.open', 'Menu'), function () { S.navOpen = !S.navOpen; renderSide(); }, 'menu-btn'),
      link('/', { class: 'brand' }, h('img', { src: '/assets/apps/forums.svg', alt: '' }), h('span', { text: 'Nookara Forums' })),
      h('label', { class: 'search' }, icon('search'), q),
      h('div', { class: 'top-right' }, right));
  }
  function renderSide() {
    if (!side) return;
    var p = location.pathname;
    var item = function (href, ic, text, on) { return link(href, { class: 'nav-item' + (on ? ' active' : '') }, icon(ic), h('span', { text: text })); };
    var mine = S.me && S.me.communities || [];
    side.classList.toggle('open', S.navOpen);
    var old = document.querySelector('.scrim');
    if (old) old.remove();
    if (S.navOpen) document.body.append(h('div', { class: 'scrim', onClick: function () { S.navOpen = false; renderSide(); } }));
    fill(side,
      item('/c/important', 'megaphone', L('important.title', 'Important'), p === '/c/important'),
      item('/', 'house', L('nav.home', 'Home'), p === '/' || p === '/new' || p === '/top'),
      item('/communities', 'layout-list', L('nav.communities', 'Communities'), p === '/communities'),
      S.me && item('/create', 'plus', L('nav.create', 'Start a community'), p === '/create'),
      mine.length ? h('div', { class: 'nav-head', text: L('nav.yours', 'Your communities') }) : null,
      mine.map(function (c) {
        return link('/c/' + esc(c.slug), { class: 'nav-item' + (p.indexOf('/c/' + c.slug) === 0 ? ' active' : '') }, c.icon && safeImage(c.icon) ? h('img', { src: c.icon, alt: '' }) : icon('hash'), h('span', { text: c.name }));
      }),
      h('div', { class: 'side-foot' }, L('foot.part', 'Part of '), h('a', { href: S.cfg.site || 'https://nookara.cc', text: 'Nookara' }), '. ', h('a', { href: (S.cfg.site || '') + '/tos', text: L('foot.terms', 'Terms') }), ', ', h('a', { href: (S.cfg.site || '') + '/privacy', text: L('foot.privacy', 'Privacy') }), '.'));
  }
  function loading() { fill(main, h('div', { class: 'loading', text: L('loading', 'Loading...') })); }
  function failed(e) {
    var missing = e && e.code === 'not_found';
    document.title = 'Nookara Forums';
    fill(main, h('div', { class: 'page' }, h('div', { class: 'empty' }, icon(missing ? 'search-x' : 'cloud-off'), h('b', { text: missing ? L('missing', 'That isn\'t here') : L('offline', 'Can\'t reach Nookara right now') }), missing ? link('/', { class: 'btn', text: L('back_home', 'Back to the forums') }) : h('button', { type: 'button', class: 'btn', text: L('retry', 'Try again'), onClick: route }))));
  }
  function setTitle(t) { document.title = t ? t + ' - Nookara Forums' : 'Nookara Forums'; }
  function blockBanner() {
    var t = S.me && blockText(S.me.write_block);
    return t ? h('div', { class: 'notice warn' }, icon('hourglass'), h('span', { text: t })) : null;
  }

  var routeId = 0;
  function route() {
    var id = ++routeId;
    var p = location.pathname.replace(/\/+$/, '') || '/';
    var q = new URLSearchParams(location.search);
    renderSide();
    window.scrollTo(0, 0);
    var m;
    var guard = function (fn) { return function (x) { if (id === routeId) return fn(x); }; };
    var run = function (promise, fn) { loading(); return promise.then(guard(fn)).catch(guard(failed)); };
    if (p === '/' || p === '/new' || p === '/top') return run(get('/home?sort=' + (p === '/' ? (q.get('sort') || 'hot') : p.slice(1)) + '&page=' + (q.get('page') || 1)), function (d) { homePage(d, p === '/' ? 'hot' : p.slice(1), +q.get('page') || 1); });
    if (p === '/communities') return run(get('/directory'), communitiesPage);
    if (p === '/search') return run(get('/search?q=' + esc(q.get('q') || '') + '&tag=' + esc(q.get('tag') || '') + '&page=' + (q.get('page') || 1)), function (d) { searchPage(d, q.get('q') || '', +q.get('page') || 1, q.get('tag') || ''); });
    if (p === '/create') return run(get('/categories'), createPage);
    if (p === '/settings') return settingsPage();
    if (p === '/manage') return run(Promise.all([get('/categories'), S.me && S.me.staff ? get('/bans') : { bans: [] }]), staffPage);
    if ((m = /^\/c\/([^/]+)\/new$/.exec(p))) return run(get('/c/' + m[1]), newTopicPage);
    if ((m = /^\/c\/([^/]+)\/manage(?:\/([a-z]+))?$/.exec(p))) return run(Promise.all([get('/c/' + m[1]), get('/categories')]), function (d) { managePage(d[0], d[1].categories, m[2] || 'settings'); });
    if ((m = /^\/c\/([^/]+)$/.exec(p))) {
      var sort = q.get('sort') || 'latest', page = +q.get('page') || 1;
      var tag = q.get('tag') || '';
      return run(Promise.all([get('/c/' + m[1]), get('/c/' + m[1] + '/topics?sort=' + esc(sort) + '&page=' + page + (tag ? '&tag=' + esc(tag) : ''))]), function (d) { communityPage(d[0], d[1], sort, page, tag); });
    }
    if ((m = /^\/t\/(\d+)/.exec(p))) {
      return run(get('/t/' + m[1] + '?page=' + (q.get('page') || 1)), function (d) {
        topicPage(d);
        var hash = location.hash.slice(1);
        var el = hash && document.getElementById(hash);
        if (el) { el.scrollIntoView(); flash(el); }
      });
    }
    if ((m = /^\/u\/([^/]+)$/.exec(p))) return run(get('/u/' + m[1]), profilePage);
    failed({ code: 'not_found' });
  }
  function pager(current, hasMore, totalPages, href) {
    if (current === 1 && !hasMore && (!totalPages || totalPages === 1)) return null;
    var items = [];
    if (current > 1) items.push(link(href(current - 1), { 'aria-label': L('pager.prev', 'Previous page') }, icon('chevron-left')));
    if (totalPages) {
      var shown = {};
      [1, current - 2, current - 1, current, current + 1, current + 2, totalPages].forEach(function (n) { if (n >= 1 && n <= totalPages) shown[n] = 1; });
      var prev = 0;
      Object.keys(shown).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
        if (prev && n > prev + 1) items.push(h('span', { text: '...' }));
        items.push(n === current ? h('span', { class: 'now', text: String(n) }) : link(href(n), { text: String(n) }));
        prev = n;
      });
    } else items.push(h('span', { class: 'now', text: String(current) }));
    if (hasMore || (totalPages && current < totalPages)) items.push(link(href(current + 1), { 'aria-label': L('pager.next', 'Next page') }, icon('chevron-right')));
    return h('div', { class: 'pager' }, items);
  }

  function voteBox(t, inline) {
    var n = h('span', { class: 'vote-n', text: num(t.score) });
    var b = h('button', { type: 'button', class: 'vote-btn' + (t.voted ? ' on' : ''), title: L('vote.up', 'Upvote'), 'aria-label': L('vote.up', 'Upvote'), 'aria-pressed': t.voted ? 'true' : 'false', onClick: needSignIn(function () {
      var on = !t.voted;
      call('POST', '/t/' + t.id + '/vote', { on: on }).then(function (r) {
        t.voted = r.voted; t.score = r.score;
        n.textContent = num(r.score);
        b.classList.toggle('on', r.voted);
        b.setAttribute('aria-pressed', r.voted ? 'true' : 'false');
      }).catch(function (e) { toast(errorText(e.code), true); });
    }) }, icon('arrow-big-up'));
    return h('div', { class: inline ? 'vote action' : 'vote' }, b, n);
  }
  function topicLink(t) { return location.origin + '/t/' + t.id; }
  function shareTopic(t) {
    var url = topicLink(t);
    if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) { navigator.share({ title: t.title, url: url }).catch(function () {  }); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(url);
    toast(L('post.copied', 'Link copied.'));
  }
  function cardMenu(e, t) {
    var mine = S.me && t.author && t.author.id === S.me.id;
    menu(e.currentTarget, [
      { icon: 'link', text: L('post.copy_link', 'Copy link'), on: function () { shareTopic(t); } },
      !mine && { icon: 'flag', text: L('post.report', 'Report'), on: function () {
        if (!S.me) return signIn();
        get('/t/' + t.id).then(function (d) { reportDialog({ id: d.topic.first_post_id }, d.community); }).catch(function (x) { toast(errorText(x.code), true); });
      } },
    ]);
  }
  function feedCard(t) {
    var c = t.community;
    var card = h('article', { class: 'card', onClick: function (e) {
      if (e.composedPath().some(function (el) { return el.tagName === 'A' || el.tagName === 'BUTTON'; }) || (window.getSelection && String(window.getSelection()))) return;
      go('/t/' + t.id);
    } },
      h('div', { class: 'card-line' },
        c ? link('/c/' + esc(c.slug), { class: 'cname' }, c.icon && safeImage(c.icon) ? h('img', { src: c.icon, alt: '' }) : h('span', { class: 'cicon', text: String(c.name || c.slug).charAt(0).toUpperCase() }), h('span', { text: 'c/' + c.slug })) : avatar(t.author, 24),
        userLink(t.author), h('span', { text: '•' }), h('span', { title: fmtDate(t.created_at), text: ago(t.created_at) }),
        t.state === 'pending' && h('span', { class: 'chip warn', text: L('state.pending', 'Waiting for review') }),
        t.pinned && !c && h('span', { class: 'chip accent' }, icon('pin'), L('topic.pinned', 'Pinned')),
        t.locked && h('span', { class: 'chip' }, icon('lock'), L('topic.locked', 'Locked')),
        h('span', { class: 'spacer' }),
        iconBtn('ellipsis', L('post.more', 'More'), function (e) { cardMenu(e, t); })),
      link('/t/' + t.id, { class: 'card-title', text: t.title }),
      tagChips(t.tags, c ? searchTag : function (x) { return location.pathname + '?tag=' + esc(x.name); }),
      t.excerpt && h('div', { class: 'card-excerpt', text: t.excerpt }),
      t.image && safeImage(t.image) && link('/t/' + t.id, { class: 'card-media' }, h('img', { class: 'card-media-blur', src: t.image, alt: '', 'aria-hidden': 'true', loading: 'lazy' }), h('img', { class: 'card-media-img', src: t.image, alt: '', loading: 'lazy' })),
      h('div', { class: 'card-actions' },
        voteBox(t, true),
        link('/t/' + t.id + '?page=last', { class: 'action', title: t.replies === 1 ? L('topic.reply_one', '{n} reply', { n: num(t.replies) }) : L('topic.reply_many', '{n} replies', { n: num(t.replies) }) }, icon('message-circle'), h('span', { text: num(t.replies) })),
        h('button', { type: 'button', class: 'action', title: L('post.share', 'Share'), 'aria-label': L('post.share', 'Share'), onClick: function () { shareTopic(t); } }, icon('share-2')),
        h('span', { class: 'action-views', title: L('board.views', 'Views') }, icon('eye'), h('span', { text: num(t.views) }))));
    return card;
  }
  function importantBand(topics) {
    if (!topics || !topics.length) return null;
    return h('section', { class: 'important' },
      h('div', { class: 'important-head' }, icon('megaphone'), h('span', { text: L('important.title', 'Important') }), h('span', { class: 'spacer' }), link('/c/important', { class: 'important-all', text: L('important.all', 'See all') })),
      topics.map(function (t) {
        return h('div', { class: 'important-row' }, t.pinned && icon('pin'), link('/t/' + t.id, { class: 'important-title', text: t.title }), h('span', { class: 'meta', title: fmtDate(t.created_at), text: ago(t.created_at) }));
      }));
  }
  function homePage(d, sort, page) {
    setTitle('');
    var sorts = [['hot', 'flame', '/', L('sort.hot', 'Hot')], ['new', 'clock', '/new', L('sort.new', 'New')], ['top', 'trophy', '/top', L('sort.top', 'Top')]];
    fill(main, h('div', { class: 'page', style: 'max-width:820px' },
      blockBanner(),
      importantBand(d.important),
      h('div', { class: 'title-row' }, h('h1', { text: L('home.title', 'Popular') }), h('span', { class: 'spacer' }),
        h('div', { class: 'tabs' }, sorts.map(function (s) { return link(s[2], { class: 'tab' + (s[0] === sort ? ' active' : '') }, icon(s[1]), h('span', { text: s[3] })); }))),
      d.topics.length ? h('div', { class: 'feed' }, d.topics.map(feedCard)) : h('div', { class: 'empty' }, icon('messages-square'), h('b', { text: L('home.empty', 'Nothing here yet') }), h('span', { text: L('home.empty_sub', 'Pick a community and start the first topic.') }), link('/communities', { class: 'btn primary', text: L('home.browse', 'Browse communities') })),
      pager(page, d.more, null, function (n) { return (sort === 'hot' ? '/' : '/' + sort) + '?page=' + n; })));
  }

  function communitiesPage(d) {
    setTitle(L('nav.communities', 'Communities'));
    var empty = !d.categories.some(function (c) { return c.communities.length; });
    fill(main, h('div', { class: 'page' },
      blockBanner(),
      h('div', { class: 'title-row' }, h('h1', { text: L('nav.communities', 'Communities') }), h('span', { class: 'spacer' }), btn('plus', L('nav.create', 'Start a community'), needSignIn(function () { go('/create'); }), 'primary')),
      empty && h('div', { class: 'empty' }, icon('layout-list'), h('b', { text: L('communities.empty', 'No communities yet') }), h('span', { text: L('communities.empty_sub', 'Be the first to start one.') })),
      d.categories.filter(function (c) { return c.communities.length; }).map(function (cat) {
        return h('section', { class: 'board' + (cat.important ? ' board-important' : '') },
          h('div', { class: 'board-head' }, h('div', { class: 'name' }, cat.important && icon('megaphone'), ' ', cat.name), h('div', { class: 'n', text: L('board.topics', 'Topics') }), h('div', { class: 'n', text: L('board.posts', 'Posts') }), h('div', { class: 'last', text: L('board.last_post', 'Last post') })),
          cat.communities.map(function (c) {
            return h('div', { class: 'row' },
              h('div', { class: 'row-main' }, communityIcon(c, 'row-icon'), h('div', { style: 'min-width:0' }, link('/c/' + esc(c.slug), { class: 'row-title big', text: c.name }), h('div', { class: 'row-sub', text: c.description }), !c.important && h('div', { class: 'row-sub' }, icon('users', 'row-sub-icon'), ' ', membersText(c.members)))),
              h('div', { class: 'row-n' }, num(c.topics), h('small', { text: ' ' + L('board.topics_low', 'topics') })),
              h('div', { class: 'row-n' }, num(c.posts), h('small', { text: ' ' + L('board.posts_low', 'posts') })),
              c.last ? h('div', { class: 'row-last' }, avatar(c.last.by, 30), h('div', { style: 'min-width:0' }, link('/t/' + c.last.topic_id + '?page=last', { class: 't', text: c.last.title }), h('div', null, userLink(c.last.by), ' · ', h('span', { title: fmtDate(c.last.at), text: ago(c.last.at) })))) : h('div', { class: 'row-last', text: L('board.no_posts', 'No posts yet') }));
          }));
      })));
  }

  function membersText(n) { return n === 1 ? L('community.members_one', '{n} member', { n: num(n) }) : L('community.members_many', '{n} members', { n: num(n) }); }
  function joinBtn(c, label, cls) {
    return btn('user-plus', label || L('community.join', 'Join'), needSignIn(function () {
      call('POST', '/c/' + esc(c.slug) + '/join').then(function () { return loadMe().then(function () { renderTop(); route(); }); }).catch(function (e) { toast(errorText(e.code), true); });
    }), cls === undefined ? 'primary' : cls);
  }
  function communityHead(d, active) {
    var c = d.community, perms = d.perms;
    return h('div', { class: 'chead' },
      communityIcon(c, 'chead-icon'),
      h('div', { class: 'chead-main' },
        h('h1', null, link('/c/' + esc(c.slug), { text: c.name, style: 'color:var(--text)' })),
        h('div', { class: 'meta' }, 'c/' + c.slug + ' · ' + (c.important ? '' : membersText(c.members) + ', ') + L('community.counts', '{topics} topics, {posts} posts', { topics: num(c.topics), posts: num(c.posts) })),
        c.description && h('div', { style: 'margin-top:6px;color:var(--dim)', text: c.description }),
        c.removed && h('div', { class: 'notice danger', style: 'margin:10px 0 0' }, icon('ban'), h('span', { text: L('community.removed', 'Taken down. Only Nookara staff can see this.') + (c.removed_reason ? ' ' + c.removed_reason : '') }))),
      h('div', { class: 'chead-actions' },
        !c.removed && !c.important && !perms.member && !perms.owner && !perms.mod && (!S.me || perms.needs_join) && joinBtn(c),
        !c.removed && !c.important && perms.member && !perms.owner && !perms.mod && btn('check', L('community.joined', 'Joined'), function () {
          ask(L('community.leave_title', 'Leave c/{slug}?', { slug: c.slug }), { intro: L('community.leave_sub', 'You\'ll need to join again to post or reply here.'), action: L('community.leave', 'Leave'), danger: true, run: function () {
            return call('DELETE', '/c/' + esc(c.slug) + '/join').then(function () { return loadMe().then(function () { renderTop(); route(); }); });
          } });
        }),
        active !== 'new' && !c.removed && perms.can_topic && S.me && btn('pencil', L('community.new_topic', 'New topic'), needSignIn(function () { go('/c/' + esc(c.slug) + '/new'); }), 'primary'),
        perms.can_mod && link('/c/' + esc(c.slug) + '/manage', { class: 'btn' }, icon('settings'), h('span', { text: L('community.manage', 'Manage') })),
        c.removed && perms.staff && btn('rotate-ccw', L('community.restore', 'Bring it back'), function () { call('POST', '/c/' + esc(c.slug) + '/restore').then(route).catch(function (e) { toast(errorText(e.code), true); }); }),
        iconBtn('flag', L('community.report', 'Report this community to Nookara'), function () { reportCommunityDialog(c); })));
  }
  function moderationNotice(c, perms) {
    if (perms && perms.needs_join && !c.important) return h('div', { class: 'notice' }, icon('user-plus'), h('span', { text: L('community.join_notice', 'Join this community to post and reply.') }));
    if (c.important) return perms && perms.staff ? null : h('div', { class: 'notice' }, icon('megaphone'), h('span', { text: L('important.notice', 'Only Nookara staff can post here.') }));
    if (perms && S.me && !perms.can_topic && !perms.can_reply) return h('div', { class: 'notice' }, icon('user-check'), h('span', { text: L('community.only_listed', 'Only people the owner picked can post here.') }));
    if (perms && S.me && !perms.can_topic) return h('div', { class: 'notice' }, icon('user-check'), h('span', { text: L('community.only_listed_topics', 'Only people the owner picked can start topics here. Anyone can reply.') }));
    if (perms && S.me && !perms.can_reply) return h('div', { class: 'notice' }, icon('user-check'), h('span', { text: L('community.only_listed_replies', 'Only people the owner picked can reply here.') }));
    if (c.locked) return h('div', { class: 'notice warn' }, icon('lock'), h('span', { text: L('community.locked', 'This community is read-only. Only its moderators can post.') }));
    if (c.moderation === 'review') return h('div', { class: 'notice' }, icon('clipboard-check'), h('span', { text: L('community.review', 'A moderator reviews every post here before it shows.') }));
    return null;
  }
  function topicRow(t, slug) {
    return h('div', { class: 'row' + (t.pinned ? ' pinned' : '') + (t.state === 'pending' ? ' waiting' : '') },
      h('div', { class: 'row-main' },
        h('span', { class: 'row-icon' }, icon(t.state === 'pending' ? 'hourglass' : t.announcement ? 'megaphone' : t.locked ? 'lock' : t.pinned ? 'pin' : t.score >= 10 ? 'flame' : 'message-square')),
        h('div', { style: 'min-width:0' },
          link('/t/' + t.id, { class: 'row-title', text: t.title }),
          t.tags && t.tags.length ? [' ', tagChips(t.tags, function (x) { return '/c/' + esc(slug) + '?tag=' + esc(x.name); })] : null,
          t.state === 'pending' && [' ', h('span', { class: 'chip warn', text: L('state.pending', 'Waiting for review') })],
          h('div', { class: 'row-sub' }, L('topic.by', 'by') + ' ', userLink(t.author), ' · ', h('span', { title: fmtDate(t.created_at), text: ago(t.created_at) }), t.score ? ' · ' + L('topic.votes', 'Upvotes: {n}', { n: num(t.score) }) : ''))),
      h('div', { class: 'row-n' }, num(t.replies), h('small', { text: ' ' + L('board.replies_low', 'replies') })),
      h('div', { class: 'row-n' }, num(t.views), h('small', { text: ' ' + L('board.views_low', 'views') })),
      h('div', { class: 'row-last' }, avatar(t.last.by, 30), h('div', null, h('div', null, L('topic.by', 'by') + ' ', userLink(t.last.by)), link('/t/' + t.id + '?page=last', { class: 'meta', title: fmtDate(t.last.at), text: ago(t.last.at) }))));
  }
  function topicView() { try { return localStorage.getItem('nookara_forums_view') || 'cards'; } catch (e) { return 'cards'; } }
  function viewSwitch() {
    function pick(v) { return function () { try { localStorage.setItem('nookara_forums_view', v); } catch (e) {  } route(); }; }
    var now = topicView();
    return h('div', { class: 'tabs' },
      h('button', { type: 'button', class: 'tab' + (now === 'cards' ? ' active' : ''), title: L('view.cards', 'Cards'), 'aria-label': L('view.cards', 'Cards'), onClick: pick('cards') }, icon('rows-3')),
      h('button', { type: 'button', class: 'tab' + (now !== 'cards' ? ' active' : ''), title: L('view.list', 'List'), 'aria-label': L('view.list', 'List'), onClick: pick('list') }, icon('table-2')));
  }
  function communityPage(d, list, sort, page, tag) {
    var c = d.community;
    setTitle(c.name);
    var base = '/c/' + esc(c.slug);
    var sorts = [['latest', 'message-square', L('sort.latest', 'Latest')], ['hot', 'flame', L('sort.hot', 'Hot')], ['new', 'clock', L('sort.new', 'New')], ['top', 'trophy', L('sort.top', 'Top')]];
    var pages = Math.max(1, Math.ceil(list.total / list.page_size));
    fill(main, h('div', { class: 'page' },
      blockBanner(),
      h('div', { class: 'crumbs' }, link('/communities', { text: L('nav.communities', 'Communities') }), icon('chevron-right'), h('span', { text: c.name })),
      communityHead(d),
      moderationNotice(c, d.perms),
      h('div', { class: 'columns' },
        h('div', null,
          h('div', { class: 'title-row' }, viewSwitch(), h('div', { class: 'tabs' }, sorts.map(function (s) { return link(base + '?' + (s[0] === 'latest' ? '' : 'sort=' + s[0] + '&') + (tag ? 'tag=' + esc(tag) : ''), { class: 'tab' + (s[0] === sort ? ' active' : '') }, icon(s[1]), h('span', { text: s[2] })); }))),
          d.tags.length ? h('div', { class: 'tag-filter' }, link(base, { class: 'tag off' + (tag ? '' : ' all-on'), text: L('tags.all', 'All') }), d.tags.map(function (x) {
            var active = tag && tag.toLowerCase() === x.name.toLowerCase();
            return link(active ? base : base + '?tag=' + esc(x.name), { class: 'tag' + (active ? ' on' : ' off'), style: active ? tagStyle(x.color) : 'color:' + x.color + ';border-color:' + x.color, text: x.name });
          })) : null,
          list.announcements && list.announcements.length ? h('section', { class: 'board board-important' },
            h('div', { class: 'board-head' }, h('div', { class: 'name' }, icon('megaphone'), ' ', L('community.announcements', 'Announcements')), h('div', { class: 'n', text: L('board.replies', 'Replies') }), h('div', { class: 'n', text: L('board.views', 'Views') }), h('div', { class: 'last', text: L('board.last_post', 'Last post') })),
            list.announcements.map(function (t) { return topicRow(t, c.slug); })) : null,
          list.topics.length && topicView() === 'cards' ? h('div', { class: 'feed' }, list.topics.map(feedCard)) : null,
          list.topics.length && topicView() !== 'cards' ? h('section', { class: 'board' },
            h('div', { class: 'board-head' }, h('div', { text: L('board.topics', 'Topics') }), h('div', { class: 'n', text: L('board.replies', 'Replies') }), h('div', { class: 'n', text: L('board.views', 'Views') }), h('div', { class: 'last', text: L('board.last_post', 'Last post') })),
            list.topics.map(function (t) { return topicRow(t, c.slug); })) : null,
          !list.topics.length && h('div', { class: 'empty' }, icon('messages-square'), h('b', { text: L('community.empty', 'No topics yet') }), h('span', { text: L('community.empty_sub', 'Start the first one.') })),
          pager(page, list.more, pages, function (n) { return base + '?page=' + n + (sort === 'latest' ? '' : '&sort=' + sort) + (tag ? '&tag=' + esc(tag) : ''); })),
        h('aside', null,
          c.rules && h('div', { class: 'panel' }, h('h2', { text: L('community.rules', 'Rules') }), renderText(c.rules)),
          h('div', { class: 'panel' }, h('h2', { text: L('community.team', 'Team') }),
            !c.important && h('div', { class: 'meta', style: 'margin-bottom:6px' }, membersText(c.members)),
            d.owner ? h('div', { class: 'person' }, avatar(d.owner, 24), userLink(d.owner), h('span', { class: 'chip accent', text: L('community.owner', 'Owner') })) : h('div', { class: 'meta', text: L('community.no_owner', 'No owner right now') }),
            d.mods.map(function (m) { return h('div', { class: 'person' }, avatar(m, 24), userLink(m)); }),
            h('div', { class: 'meta', style: 'margin-top:8px', text: L('community.since', 'Started {when}', { when: fmtDay(c.created_at) }) }))))));
  }

  function flagImg(cc) {
    if (!cc || !/^[a-z]{2}$/i.test(cc)) return null;
    return h('img', { class: 'post-flag extra', src: '/assets/flags/' + cc.toLowerCase() + '.png', alt: cc.toUpperCase(), title: cc.toUpperCase(), loading: 'lazy' });
  }
  function authorPanel(a) {
    if (!a) return h('div', { class: 'post-author' }, avatar(null, 100), h('span', { class: 'name', text: L('deleted_user', 'Deleted user') }));
    return h('div', { class: 'post-author' },
      link('/u/' + esc(a.username), null, avatar(a, 100)),
      userLink(a, 'name'),
      h('span', { class: 'chip ' + (['owner', 'admin', 'mod'].indexOf(a.rank) >= 0 ? 'accent' : ''), text: rankText(a) }),
      a.badges && a.badges.length ? h('div', { class: 'post-badges extra' }, a.badges.map(function (b) { return b.icon && safeBadge(b.icon) ? h('img', { src: badgeSrc(b.icon), alt: b.name, title: b.name, loading: 'lazy' }) : null; })) : null,
      h('span', { class: 'extra', text: L('author.posts', 'Posts: {n}', { n: num(a.posts) }) }),
      a.joined && h('span', { class: 'extra', text: L('author.joined', 'Joined: {when}', { when: fmtDay(a.joined) }) }),
      flagImg(a.country));
  }
  function badgeSrc(u) { return u.charAt(0) === '/' ? (S.cfg.site || '') + u : u; }
  function safeBadge(u) { try { var x = new URL(u, location.href); return x.protocol === 'https:' || x.origin === location.origin; } catch (e) { return false; } }
  function rankText(a) {
    var map = { owner: ['rank.owner', 'Owner'], admin: ['rank.admin', 'Network Administrator'], mod: ['rank.mod', 'Moderator'], pro: ['rank.pro', 'Pro'], plus: ['rank.pro', 'Pro'], banned: ['rank.banned', 'Banned'] };
    var e = map[a.rank] || ['rank.member', 'Member'];
    return L(e[0], e[1]);
  }
  function quotePost(p, comp) {
    var name = p.author ? p.author.username : '';
    comp.insert('[quote=' + name + '#' + p.id + ']\n' + p.body + '\n[/quote]');
    comp.ta.scrollIntoView({ block: 'center' });
  }
  function act(promise, okText) {
    return promise.then(function () { if (okText) toast(okText); return route(); }).catch(function (e) { toast(errorText(e.code), true); });
  }
  function editDialog(p, topic) {
    var d = dialog(L('edit.title', 'Edit post'));
    var title = p.is_first ? h('input', { maxlength: 120, value: topic.title }) : null;
    var comp = composer({ value: p.body });
    var msg = h('div', { class: 'err' });
    var save = h('button', { type: 'button', class: 'btn primary', text: L('save', 'Save'), onClick: function () {
      save.disabled = true;
      call('PATCH', '/posts/' + p.id, p.is_first ? { body: comp.ta.value, title: title.value } : { body: comp.ta.value }).then(function (r) { d.close(); if (r.state === 'pending') toast(L('composer.held', 'Sent. A moderator will review it before it shows.')); route(); }).catch(function (e) { save.disabled = false; msg.textContent = errorText(e.code); });
    } });
    d.box.style.width = 'min(720px, 100%)';
    d.box.append(title && h('label', { class: 'field' }, h('span', { text: L('new.title', 'Title') }), title) || '', comp.el, msg, h('div', { class: 'actions' }, save, h('button', { type: 'button', class: 'btn', text: L('cancel', 'Cancel'), onClick: d.close })));
    paint();
  }
  function removeDialog(p, slug) {
    var isMine = p.mine;
    if (isMine) {
      ask(L('remove.mine_title', 'Delete your post?'), { intro: p.is_first ? L('remove.mine_first', 'This is the first post, so the whole topic goes with it.') : L('remove.mine_sub', 'This can\'t be undone.'), action: L('remove.delete', 'Delete'), danger: true, run: function () {
        return call('DELETE', '/posts/' + p.id, {}).then(function () { if (p.is_first) go('/c/' + esc(slug)); else route(); });
      } });
      return;
    }
    ask(L('remove.title', 'Remove this post?'), { intro: p.is_first ? L('remove.first', 'This is the first post, so the whole topic is removed with it. Its author is told.') : L('remove.sub', 'Its author is told. You can restore it for 30 days.'), action: L('remove.remove', 'Remove'), danger: true,
      fields: [{ name: 'reason', label: L('remove.reason', 'Reason (shown to them)'), max: 300 }],
      run: function (v) { return call('DELETE', '/posts/' + p.id, { reason: v.reason }).then(route); } });
  }
  function banDialog(slug, username) {
    ask(L('ban.title', 'Ban {name} from c/{slug}?', { name: username, slug: slug }), { action: L('ban.action', 'Ban'), danger: true,
      fields: [{ name: 'reason', label: L('ban.reason', 'Reason (shown to them)'), max: 300 }, { name: 'days', label: L('ban.days', 'Days (empty = until you lift it)'), type: 'number', min: 1 }],
      run: function (v) { return call('POST', '/c/' + esc(slug) + '/bans', { username: username, reason: v.reason, days: v.days }).then(function () { toast(L('ban.done', 'Banned.')); }); } });
  }
  function postCard(p, n, d, comp) {
    var topic = d.topic, c = d.community, perms = d.perms;
    var gone = p.state === 'removed' || p.state === 'deleted';
    var blockedBody = null;
    if (gone && !p.body) {
      return h('article', { class: 'post gone', id: 'p' + p.id }, authorPanel(p.author), h('div', { class: 'post-main' },
        h('div', { class: 'post-head' }, h('span', { class: 'post-num', text: '#' + n }), h('span', { title: fmtDate(p.created_at), text: ago(p.created_at) })),
        h('div', { class: 'meta', text: p.state === 'removed' ? L('state.removed', 'A moderator removed this post.') + (p.removed_reason ? ' ' + p.removed_reason : '') : L('state.deleted', 'This post was deleted.') })));
    }
    var body = renderText(p.body);
    if (p.blocked) {
      blockedBody = h('div', { class: 'meta' }, L('post.blocked', 'You blocked this person, or they blocked you. '), h('a', { href: '#', text: L('post.show_anyway', 'Show it anyway'), onClick: function (e) { e.preventDefault(); fill(blockedBody, body); } }));
    }
    var moreBtn = iconBtn('ellipsis', L('post.more', 'More'), function (e) {
      var items = [];
      if (p.can_edit) items.push({ icon: 'pencil', text: L('post.edit', 'Edit'), on: function () { editDialog(p, topic); } });
      if (p.can_remove) items.push({ icon: 'trash-2', text: p.mine ? L('post.delete', 'Delete') : L('post.remove', 'Remove'), danger: true, on: function () { removeDialog(p, c.slug); } });
      if (p.can_restore) items.push({ icon: 'rotate-ccw', text: L('post.restore', 'Restore'), on: function () { act(call('POST', '/posts/' + p.id + '/restore')); } });
      if (perms.can_mod && !p.mine && p.author) items.push({ icon: 'user-x', text: L('post.ban', 'Ban from community'), danger: true, on: function () { banDialog(c.slug, p.author.username); } });
      items.push({ icon: 'link', text: L('post.copy_link', 'Copy link'), on: function () { var u = location.origin + '/t/' + topic.id + '?page=' + d.page + '#p' + p.id; navigator.clipboard && navigator.clipboard.writeText(u); toast(L('post.copied', 'Link copied.')); } });
      menu(e.currentTarget, items);
    });
    return h('article', { class: 'post' + (p.state === 'pending' ? ' waiting' : '') + (gone ? ' gone' : ''), id: 'p' + p.id },
      authorPanel(p.author),
      h('div', { class: 'post-main' },
        h('div', { class: 'post-head' },
          h('span', { class: 'post-num', text: '#' + n }),
          h('a', { href: '#p' + p.id, title: fmtDate(p.created_at), text: ago(p.created_at), style: 'color:inherit' }),
          p.edited_at && h('span', { title: fmtDate(p.edited_at), text: L('post.edited', 'edited') }),
          p.state === 'pending' && h('span', { class: 'chip warn', text: L('state.pending', 'Waiting for review') }),
          gone && h('span', { class: 'chip danger', text: p.state === 'removed' ? L('state.removed_chip', 'Removed') : L('state.deleted_chip', 'Deleted') })),
        p.removed_reason ? h('div', { class: 'meta', style: 'margin-bottom:8px', text: L('state.reason', 'Reason: {reason}', { reason: p.removed_reason }) }) : null,
        h('div', { class: 'post-body' }, blockedBody || body),
        p.author && p.author.signature ? h('div', { class: 'sig' }, renderText(p.author.signature, 3)) : null,
        h('div', { class: 'post-foot' },
          p.can_review && btn('check', L('queue.approve', 'Approve'), function () { act(call('POST', '/posts/' + p.id + '/approve')); }, 'small primary'),
          p.can_review && btn('x', L('queue.reject', 'Reject'), function () { rejectDialog(p); }, 'small danger'),
          !gone && p.state === 'visible' && comp && btn('quote', L('post.quote', 'Quote'), function () { quotePost(p, comp); }, 'small'),
          h('span', { class: 'spacer' }),
          !p.mine && !gone && iconBtn('flag', L('post.report', 'Report'), function () { reportDialog(p, c); }),
          moreBtn)));
  }
  function rejectDialog(p) {
    ask(L('queue.reject_title', 'Don\'t approve this post?'), { action: L('queue.reject', 'Reject'), danger: true, fields: [{ name: 'reason', label: L('remove.reason', 'Reason (shown to them)'), max: 300 }],
      run: function (v) { return call('POST', '/posts/' + p.id + '/reject', { reason: v.reason }).then(route); } });
  }
  function topicPage(d) {
    var t = d.topic, c = d.community, perms = d.perms;
    setTitle(t.title);
    var base = '/t/' + t.id;
    var closed = (t.locked || c.locked) && !perms.can_mod;
    var comp = S.me && !S.me.write_block && !closed && perms.can_reply && t.state === 'visible' ? composer({ placeholder: L('composer.reply', 'Write a reply...') }) : null;
    var msg = h('div', { class: 'err' });
    var modMenu = perms.can_mod && iconBtn('shield', L('topic.tools', 'Moderator tools'), function (e) {
      menu(e.currentTarget, [
        { icon: 'megaphone', text: t.announcement ? L('topic.unannounce', 'Stop being an announcement') : L('topic.announce', 'Make it an announcement'), on: function () { act(call('PATCH', base, { announcement: !t.announcement })); } },
        { icon: t.pinned ? 'pin-off' : 'pin', text: t.pinned ? L('topic.unpin', 'Unpin') : L('topic.pin', 'Pin'), on: function () { act(call('PATCH', base, { pinned: !t.pinned })); } },
        { icon: t.locked ? 'lock-open' : 'lock', text: t.locked ? L('topic.unlock', 'Unlock') : L('topic.lock', 'Lock'), on: function () { act(call('PATCH', base, { locked: !t.locked })); } },
        { icon: 'move-right', text: L('topic.move', 'Move to another community'), on: function () {
          ask(L('topic.move', 'Move to another community'), { action: L('topic.move_action', 'Move'), fields: [{ name: 'to', label: L('topic.move_to', 'Community address (you need to moderate it)'), placeholder: 'c/...' }], run: function (v) { return call('PATCH', base, { community: v.to.replace(/^c\//, '') }).then(route); } });
        } },
      ]);
    });
    var send = comp && h('button', { type: 'button', class: 'btn primary', text: L('composer.send', 'Post reply'), onClick: function () {
      send.disabled = true;
      msg.textContent = '';
      call('POST', base + '/posts', { body: comp.ta.value }).then(function (r) {
        comp.ta.value = '';
        send.disabled = false;
        if (r.state === 'pending') toast(L('composer.held', 'Sent. A moderator will review it before it shows.'));
        return get('/posts/' + r.id + '/where').then(function (w) { go('/t/' + t.id + '?page=' + w.page + '#p' + r.id); });
      }).catch(function (e) { send.disabled = false; msg.textContent = errorText(e.code); });
    } });
    var loginPrompt = !S.me && !t.locked && !c.locked && perms.can_reply ? h('div', { class: 'composer' }, h('div', { class: 'actions', style: 'margin:0' }, btn('log-in', L('signin.to_reply', 'Sign in to reply'), signIn, 'primary'))) : null;
    fill(main, h('div', { class: 'page' },
      h('div', { class: 'crumbs' }, link('/communities', { text: L('nav.communities', 'Communities') }), icon('chevron-right'), link('/c/' + esc(c.slug), { text: c.name })),
      h('div', { class: 'title-row', style: 'flex-wrap:nowrap;align-items:flex-start' }, voteBox(t),
        h('div', { style: 'flex:1;min-width:0' }, h('h1', { text: t.title }),
          h('div', { class: 'meta', style: 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px' },
            t.announcement && h('span', { class: 'chip accent' }, icon('megaphone'), L('topic.announcement', 'Announcement')),
            t.pinned && h('span', { class: 'chip accent' }, icon('pin'), L('topic.pinned', 'Pinned')), t.locked && h('span', { class: 'chip' }, icon('lock'), L('topic.locked', 'Locked')),
            tagChips(t.tags, searchTag),
            d.tags.length && S.me && !S.me.write_block && (t.mine || perms.can_mod) ? h('button', { type: 'button', class: 'btn small', text: L('topic.edit_tags', 'Edit tags'), onClick: function () {
              var dlg = dialog(L('topic.edit_tags', 'Edit tags'));
              var picker = tagPicker(d.tags, t.tags);
              var msg2 = h('div', { class: 'err' });
              var save = h('button', { type: 'button', class: 'btn primary', text: L('save', 'Save'), onClick: function () {
                save.disabled = true;
                call('PATCH', base, { tags: picker.value() }).then(function () { dlg.close(); route(); }).catch(function (e) { save.disabled = false; msg2.textContent = errorText(e.code); });
              } });
              dlg.box.append(picker.el, msg2, h('div', { class: 'actions' }, save, h('button', { type: 'button', class: 'btn', text: L('cancel', 'Cancel'), onClick: dlg.close })));
              paint();
            } }) : null,
            t.state === 'pending' && h('span', { class: 'chip warn', text: L('state.pending', 'Waiting for review') }), t.state === 'removed' && h('span', { class: 'chip danger', text: L('state.removed_chip', 'Removed') }),
            h('span', { text: L('topic.stats', 'Replies: {replies} · Views: {views}', { replies: num(t.replies), views: num(t.views) }) }))),
        modMenu),
      blockBanner(),
      pager(d.page, false, d.pages, function (n) { return base + '?page=' + n; }),
      d.posts.map(function (p, i) { return postCard(p, d.first_number + i, d, comp); }),
      pager(d.page, false, d.pages, function (n) { return base + '?page=' + n; }),
      (t.locked || c.locked) && !perms.can_mod && h('div', { class: 'notice' }, icon('lock'), h('span', { text: L('topic.closed', 'This topic is locked, so there are no new replies.') })),
      S.me && !closed && perms.needs_join && h('div', { class: 'notice' }, icon('user-plus'), h('span', { style: 'flex:1', text: L('community.join_notice', 'Join this community to post and reply.') }), joinBtn(c, L('community.join_to_reply', 'Join to reply'))),
      S.me && !closed && !perms.can_reply && !perms.needs_join && h('div', { class: 'notice' }, icon(c.important ? 'megaphone' : 'user-check'), h('span', { text: c.important ? L('important.no_replies', 'Only Nookara staff can reply here.') : L('community.only_listed_replies', 'Only people the owner picked can reply here.') })),
      comp && h('section', { class: 'composer' }, h('h2', { style: 'margin-bottom:8px', text: L('composer.title', 'Reply') }), comp.el, msg, h('div', { class: 'actions' }, send, c.moderation === 'review' && !perms.can_mod && h('span', { class: 'meta', text: L('community.review', 'A moderator reviews every post here before it shows.') }))),
      loginPrompt));
  }

  function newTopicPage(d) {
    var c = d.community;
    setTitle(L('community.new_topic', 'New topic'));
    if (!S.me) { fill(main, h('div', { class: 'page' }, communityHead(d, 'new'), h('div', { class: 'empty' }, h('b', { text: L('signin.to_post', 'Sign in to post') }), btn('log-in', L('signin.button', 'Sign in'), signIn, 'primary')))); return; }
    var title = h('input', { maxlength: S.cfg.limits.title || 120, placeholder: L('new.title_ph', 'What\'s this about?') });
    var comp = composer({ placeholder: L('new.body_ph', 'Say more...') });
    var picker = d.tags.length ? tagPicker(d.tags) : null;
    var announce = false;
    var announceSwitch = d.perms.can_mod ? h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': 'false', onClick: function () {
      announce = !announce;
      announceSwitch.classList.toggle('on', announce);
      announceSwitch.setAttribute('aria-checked', announce ? 'true' : 'false');
    } }, h('i'), h('span', { text: L('new.announcement', 'Post as an announcement, above all other topics') })) : null;
    var msg = h('div', { class: 'err' });
    var post = h('button', { type: 'button', class: 'btn primary', text: L('new.post', 'Post topic'), disabled: !!S.me.write_block, onClick: function () {
      post.disabled = true;
      msg.textContent = '';
      call('POST', '/c/' + esc(c.slug) + '/topics', { title: title.value, body: comp.ta.value, tags: picker ? picker.value() : [], announcement: announce }).then(function (r) {
        if (r.state === 'pending') toast(L('composer.held', 'Sent. A moderator will review it before it shows.'));
        go('/t/' + r.id);
      }).catch(function (e) { post.disabled = false; msg.textContent = errorText(e.code); });
    } });
    fill(main, h('div', { class: 'page', style: 'max-width:820px' },
      blockBanner(),
      h('div', { class: 'crumbs' }, link('/c/' + esc(c.slug), { text: c.name }), icon('chevron-right'), h('span', { text: L('community.new_topic', 'New topic') })),
      h('h1', { style: 'margin-bottom:14px', text: L('new.heading', 'New topic in {name}', { name: c.name }) }),
      moderationNotice(c, d.perms),
      c.rules && h('div', { class: 'panel' }, h('h2', { text: L('community.rules', 'Rules') }), renderText(c.rules)),
      h('div', { class: 'composer', style: 'margin-top:0' },
        h('label', { class: 'field' }, h('span', { text: L('new.title', 'Title') }), title),
        picker && h('div', { class: 'field' }, h('span', { text: L('new.tags', 'Tags (up to 3)') }), picker.el),
        comp.el,
        announceSwitch && h('div', { style: 'margin-top:10px' }, announceSwitch),
        msg, h('div', { class: 'actions' }, post, link('/c/' + esc(c.slug), { class: 'btn', text: L('cancel', 'Cancel') })))));
    title.focus();
  }

  function createPage(d) {
    setTitle(L('nav.create', 'Start a community'));
    if (!S.me) { fill(main, h('div', { class: 'page' }, h('div', { class: 'empty' }, h('b', { text: L('signin.to_create', 'Sign in to start a community') }), btn('log-in', L('signin.button', 'Sign in'), signIn, 'primary')))); return; }
    var name = h('input', { maxlength: 40 });
    var slug = h('input', { maxlength: 32, autocapitalize: 'off', spellcheck: 'false' });
    var touched = false;
    name.addEventListener('input', function () { if (!touched) slug.value = name.value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32); });
    slug.addEventListener('input', function () { touched = true; });
    var desc = h('input', { maxlength: 300 });
    var cat = h('select', null, h('option', { value: '', text: L('create.pick', 'Choose one') }), d.categories.filter(function (c) { return !c.staff_only || S.me.staff; }).map(function (c) { return h('option', { value: c.id, text: c.name }); }));
    var rules = h('textarea', { maxlength: 4000, style: 'min-height:90px' });
    var msg = h('div', { class: 'err' });
    var make = h('button', { type: 'button', class: 'btn primary', text: L('create.action', 'Start it'), disabled: !!S.me.write_block, onClick: function () {
      make.disabled = true;
      msg.textContent = '';
      call('POST', '/communities', { name: name.value, slug: slug.value, description: desc.value, category_id: cat.value, rules: rules.value }).then(function (r) {
        return loadMe().then(function () { go('/c/' + esc(r.community.slug)); });
      }).catch(function (e) { make.disabled = false; msg.textContent = errorText(e.code); });
    } });
    fill(main, h('div', { class: 'page', style: 'max-width:620px' },
      blockBanner(),
      h('h1', { style: 'margin-bottom:14px', text: L('nav.create', 'Start a community') }),
      h('div', { class: 'composer', style: 'margin-top:0' },
        h('label', { class: 'field' }, h('span', { text: L('create.name', 'Name') }), name),
        h('label', { class: 'field' }, h('span', { text: L('create.slug', 'Address') }), h('div', { class: 'slug-input' }, h('b', { text: 'c/' }), slug), h('small', { text: L('create.slug_sub', 'Lowercase letters, numbers, dashes. This can\'t change later.') })),
        h('label', { class: 'field' }, h('span', { text: L('create.category', 'Category') }), cat),
        h('label', { class: 'field' }, h('span', { text: L('create.description', 'Description') }), desc),
        h('label', { class: 'field' }, h('span', { text: L('create.rules', 'Rules (optional)') }), rules, h('small', { text: L('create.rules_sub', 'Nookara\'s own rules always apply on top of these.') })),
        msg, h('div', { class: 'actions' }, make))));
  }

  function managePage(d, categories, tab) {
    var c = d.community, perms = d.perms;
    setTitle(L('community.manage', 'Manage') + ' ' + c.name);
    if (!perms.can_mod) return failed({ code: 'not_found' });
    var base = '/c/' + esc(c.slug) + '/manage';
    var tabs = [['settings', 'settings', L('manage.settings', 'Settings')], ['queue', 'inbox', L('manage.queue', 'Review queue')], perms.can_manage && !c.important && ['access', 'user-check', L('manage.access', 'Who can post')], ['tags', 'tags', L('manage.tags', 'Tags')], ['mods', 'users', L('manage.mods', 'Moderators')], ['bans', 'user-x', L('manage.bans', 'Bans')], ['log', 'scroll-text', L('manage.log', 'Log')]];
    var content = h('div', null);
    fill(main, h('div', { class: 'page' },
      h('div', { class: 'crumbs' }, link('/c/' + esc(c.slug), { text: c.name }), icon('chevron-right'), h('span', { text: L('community.manage', 'Manage') })),
      h('div', { class: 'title-row' }, h('h1', { text: L('manage.heading', 'Manage {name}', { name: c.name }) })),
      h('div', { class: 'title-row' }, h('div', { class: 'tabs', style: 'flex-wrap:wrap' }, tabs.filter(Boolean).map(function (t) { return link(base + (t[0] === 'settings' ? '' : '/' + t[0]), { class: 'tab' + (t[0] === tab ? ' active' : '') }, icon(t[1]), h('span', { text: t[2] })); }))),
      content));
    if (tab === 'queue') return queueTab(content, c);
    if (tab === 'mods') return modsTab(content, d);
    if (tab === 'tags') return tagsTab(content, d);
    if (tab === 'access' && perms.can_manage && !c.important) return accessTab(content, d);
    if (tab === 'bans') return bansTab(content, c);
    if (tab === 'log') return logTab(content, c);
    settingsTab(content, d, categories);
  }
  function settingsTab(box, d, categories) {
    var c = d.community, perms = d.perms;
    if (!perms.can_manage) { fill(box, h('div', { class: 'notice' }, icon('info'), h('span', { text: L('manage.owner_only', 'Only the owner can change these. You can use the review queue, bans and log.') }))); return; }
    var name = h('input', { maxlength: 40, value: c.name });
    var desc = h('input', { maxlength: 300, value: c.description });
    var cat = h('select', { disabled: c.important && !perms.staff }, categories.filter(function (x) { return !x.staff_only || perms.staff || x.id === c.category_id; }).map(function (x) { return h('option', { value: x.id, text: x.name, selected: x.id === c.category_id }); }));
    var rules = h('textarea', { maxlength: 4000, style: 'min-height:110px', value: c.rules });
    var moderation = c.moderation, locked = c.locked, iconUrl = c.icon;
    var choices = {};
    function modChoice(key, ic, title, sub) {
      var el = h('button', { type: 'button', class: 'choice', onClick: function () { moderation = key; syncMod(); } }, icon(ic), h('span', null, h('b', { text: title }), h('small', { text: sub })));
      choices[key] = el;
      return el;
    }
    function syncMod() { Object.keys(choices).forEach(function (k) { choices[k].classList.toggle('on', k === moderation); }); }
    var lockSwitch = h('button', { type: 'button', class: 'switch' + (locked ? ' on' : ''), role: 'switch', 'aria-checked': locked ? 'true' : 'false', onClick: function () {
      locked = !locked;
      lockSwitch.classList.toggle('on', locked);
      lockSwitch.setAttribute('aria-checked', locked ? 'true' : 'false');
    } }, h('i'), h('span', { text: L('manage.locked', 'Read-only: only moderators can post') }));
    var iconView = h('div', { class: 'person' });
    function drawIcon() { fill(iconView, communityIcon({ icon: iconUrl, name: c.name }, 'row-icon'), iconUp, iconUrl && h('button', { type: 'button', class: 'btn small', text: L('manage.icon_remove', 'Remove'), onClick: function () { iconUrl = null; drawIcon(); } })); }
    var iconFile = h('input', { type: 'file', accept: 'image/*', class: 'hidden' });
    var iconUp = h('button', { type: 'button', class: 'btn small', text: L('manage.icon_upload', 'Upload'), onClick: function () { iconFile.click(); } });
    iconFile.addEventListener('change', function () {
      var f = iconFile.files[0];
      iconFile.value = '';
      if (f) uploadImage(f, 'icon').then(function (u) { iconUrl = u; drawIcon(); }).catch(function (e) { toast(errorText(e.code), true); });
    });
    drawIcon();
    var msg = h('div', { class: 'err' });
    var save = h('button', { type: 'button', class: 'btn primary', text: L('save', 'Save'), onClick: function () {
      save.disabled = true;
      msg.textContent = '';
      call('PATCH', '/c/' + esc(c.slug), { name: name.value, description: desc.value, rules: rules.value, category_id: cat.value, moderation: moderation, locked: locked, icon: iconUrl }).then(function () { save.disabled = false; toast(L('saved', 'Saved.')); return loadMe().then(renderSide); })
        .catch(function (e) { save.disabled = false; msg.textContent = errorText(e.code); });
    } });
    fill(box, h('div', { class: 'composer', style: 'margin-top:0;max-width:640px' },
      h('div', { class: 'field' }, h('span', { text: L('manage.icon', 'Icon') }), iconView, iconFile),
      h('label', { class: 'field' }, h('span', { text: L('create.name', 'Name') }), name),
      h('label', { class: 'field' }, h('span', { text: L('create.category', 'Category') }), cat),
      h('label', { class: 'field' }, h('span', { text: L('create.description', 'Description') }), desc),
      h('label', { class: 'field' }, h('span', { text: L('create.rules', 'Rules (optional)') }), rules),
      h('div', { class: 'field' }, h('span', { text: L('manage.moderation', 'Moderation') }),
        modChoice('open', 'zap', L('manage.mod_open', 'Post first, report after'), L('manage.mod_open_sub', 'Posts show straight away. People can report anything to you or to Nookara.')),
        modChoice('review', 'clipboard-check', L('manage.mod_review', 'Hold all posts for review'), L('manage.mod_review_sub', 'Nothing shows until you or a moderator approves it. Your team\'s own posts skip the queue.'))),
      h('div', { class: 'field' }, lockSwitch),
      msg, h('div', { class: 'actions' }, save)),
    h('div', { class: 'panel', style: 'max-width:640px;margin-top:14px' }, h('h2', { text: L('manage.danger', 'Owner actions') }), h('div', { class: 'actions', style: 'margin:0' },
      btn('arrow-right-left', L('manage.transfer', 'Hand over to someone'), function () {
        ask(L('manage.transfer', 'Hand over to someone'), { intro: L('manage.transfer_sub', 'They become the owner. You stay on as a moderator.'), action: L('manage.transfer_action', 'Hand over'), danger: true, fields: [{ name: 'username', label: L('manage.username', 'Username') }], run: function (v) { return call('POST', '/c/' + esc(c.slug) + '/transfer', { username: v.username }).then(function () { return loadMe().then(route); }); } });
      }),
      btn('trash-2', L('manage.take_down', 'Take this community down'), function () {
        if (perms.owner) {
          ask(L('manage.take_down', 'Take this community down'), { intro: L('manage.take_down_sub', 'Everything in it stops showing. Type its address to confirm.'), action: L('manage.take_down_action', 'Take it down'), danger: true, fields: [{ name: 'confirm', label: c.slug }], run: function (v) { return call('DELETE', '/c/' + esc(c.slug), { confirm: v.confirm }).then(function () { return loadMe().then(function () { go('/communities'); }); }); } });
        } else {
          ask(L('manage.take_down', 'Take this community down'), { action: L('manage.take_down_action', 'Take it down'), danger: true, fields: [{ name: 'reason', label: L('manage.staff_reason', 'Reason (for the log)'), max: 300 }], run: function (v) { return call('DELETE', '/c/' + esc(c.slug), { reason: v.reason }).then(route); } });
        }
      }, 'danger'))));
    syncMod();
    paint();
  }
  function queueTab(box, c) {
    fill(box, h('div', { class: 'loading', text: L('loading', 'Loading...') }));
    get('/c/' + esc(c.slug) + '/queue').then(function (q) {
      var slug = esc(c.slug);
      fill(box,
        h('h2', { style: 'margin-bottom:8px', text: L('queue.waiting', 'Waiting for review ({n})', { n: q.pending.length }) }),
        q.pending.length ? q.pending.map(function (p) {
          return h('div', { class: 'queue-item' },
            h('div', { class: 'card-line' }, avatar(p.author, 22), userLink(p.author), h('span', { text: ago(p.created_at) }), h('span', { class: 'chip', text: p.is_first ? L('queue.new_topic', 'New topic') : L('queue.reply', 'Reply') })),
            h('div', { style: 'margin-top:6px;font-weight:650' }, link('/t/' + p.topic_id, { text: p.topic_title })),
            renderText(p.body),
            h('div', { class: 'actions' }, btn('check', L('queue.approve', 'Approve'), function () { act(call('POST', '/posts/' + p.id + '/approve')); }, 'small primary'), btn('x', L('queue.reject', 'Reject'), function () { rejectDialog(p); }, 'small danger')));
        }) : h('div', { class: 'empty', style: 'padding:24px;margin-bottom:14px' }, h('span', { text: L('queue.none_waiting', 'Nothing is waiting.') })),
        h('h2', { style: 'margin:18px 0 8px', text: L('queue.reports', 'Reported to you ({n})', { n: q.reports.length }) }),
        q.reports.length ? q.reports.map(function (r) {
          return h('div', { class: 'queue-item' },
            h('div', { class: 'card-line' }, h('span', { class: 'chip warn', text: catLabel(r.category) }), h('span', { text: L('queue.reported_by', 'from') }), userLink(r.reporter), h('span', { text: ago(r.created_at) })),
            r.details && h('div', { style: 'margin-top:6px', text: r.details }),
            h('div', { style: 'margin-top:6px;font-weight:650' }, link('/t/' + r.topic_id + '#p' + r.post_id, { text: r.topic_title })),
            h('div', { class: 'meta' }, L('queue.written_by', 'Written by') + ' ', userLink(r.author)),
            r.body ? renderText(r.body) : h('div', { class: 'meta', text: L('state.deleted', 'This post was deleted.') }),
            h('div', { class: 'actions' },
              r.post_state !== 'removed' && btn('trash-2', L('post.remove', 'Remove'), function () { ask(L('remove.title', 'Remove this post?'), { action: L('remove.remove', 'Remove'), danger: true, fields: [{ name: 'reason', label: L('remove.reason', 'Reason (shown to them)'), max: 300 }], run: function (v) { return call('DELETE', '/posts/' + r.post_id, { reason: v.reason }).then(function () { return call('POST', '/c/' + slug + '/reports/' + r.id, { outcome: 'resolved' }); }).then(route); } }); }, 'small danger'),
              btn('check', L('queue.resolved', 'Mark as handled'), function () { act(call('POST', '/c/' + slug + '/reports/' + r.id, { outcome: 'resolved' })); }, 'small'),
              btn('x', L('queue.dismiss', 'Dismiss'), function () { act(call('POST', '/c/' + slug + '/reports/' + r.id, { outcome: 'dismissed' })); }, 'small')));
        }) : h('div', { class: 'empty', style: 'padding:24px' }, h('span', { text: L('queue.none_reports', 'No open reports.') })));
    }).catch(failed);
  }
  // who can start topics and who can reply: anyone, or only the people on this list. The community's team always can.
  function accessTab(box, d) {
    var c = d.community, slug = esc(c.slug);
    var state = { post_access: c.post_access, reply_access: c.reply_access };
    function picker(key, title, everyone, listed) {
      var els = {};
      function choice(val, ic, t, sub) {
        var el = h('button', { type: 'button', class: 'choice', onClick: function () { state[key] = val; sync(); } }, icon(ic), h('span', null, h('b', { text: t }), h('small', { text: sub })));
        els[val] = el;
        return el;
      }
      function sync() { Object.keys(els).forEach(function (k) { els[k].classList.toggle('on', k === state[key]); }); }
      var out = h('div', { class: 'field' }, h('span', { text: title }), choice('everyone', 'users', L('access.everyone', 'Everyone'), everyone), choice('listed', 'user-check', L('access.listed', 'Only people on the list'), listed));
      sync();
      return out;
    }
    var msg = h('div', { class: 'err' });
    var save = h('button', { type: 'button', class: 'btn primary', text: L('save', 'Save'), onClick: function () {
      save.disabled = true;
      msg.textContent = '';
      call('PATCH', '/c/' + slug, state).then(function () { save.disabled = false; c.post_access = state.post_access; c.reply_access = state.reply_access; toast(L('saved', 'Saved.')); }).catch(function (e) { save.disabled = false; msg.textContent = errorText(e.code); });
    } });
    var input = h('input', { placeholder: L('manage.username', 'Username'), maxlength: 64, style: 'width:220px;padding:7px 10px;background:var(--bg);border:1px solid var(--border-2)' });
    var listMsg = h('div', { class: 'err' });
    var list = h('div', null, h('div', { class: 'meta', text: L('loading', 'Loading...') }));
    function draw() {
      get('/c/' + slug + '/allowed').then(function (r) {
        fill(list, r.allowed.length ? r.allowed.map(function (m) {
          return h('div', { class: 'person' }, avatar(m, 28), userLink(m), h('span', { class: 'spacer' }), h('button', { type: 'button', class: 'btn small', text: L('manage.remove', 'Remove'), onClick: function () { call('DELETE', '/c/' + slug + '/allowed/' + esc(m.username)).then(draw).catch(function (e) { toast(errorText(e.code), true); }); } }));
        }) : h('div', { class: 'meta', text: L('access.empty', 'Nobody on the list yet. Your team can always post.') }));
      }).catch(function (e) { listMsg.textContent = errorText(e.code); });
    }
    function addPerson() {
      if (!input.value.trim()) return;
      listMsg.textContent = '';
      call('POST', '/c/' + slug + '/allowed', { username: input.value.trim() }).then(function () { input.value = ''; draw(); }).catch(function (e) { listMsg.textContent = errorText(e.code); });
    }
    fill(box,
      h('div', { class: 'composer', style: 'margin-top:0;max-width:640px' },
        picker('post_access', L('access.topics', 'Who can start topics'), L('access.topics_everyone', 'Anyone who can post on Nookara Forums.'), L('access.topics_listed', 'Only people on the list, and your team.')),
        picker('reply_access', L('access.replies', 'Who can reply'), L('access.replies_everyone', 'Anyone who can post on Nookara Forums.'), L('access.replies_listed', 'Only people on the list, and your team.')),
        msg, h('div', { class: 'actions' }, save)),
      h('div', { class: 'panel', style: 'max-width:640px;margin-top:14px' }, h('h2', { text: L('access.list', 'The list') }),
        h('div', { class: 'actions', style: 'margin:0 0 10px' }, input, btn('user-plus', L('manage.add', 'Add'), addPerson)), listMsg, list));
    draw();
  }
  function tagsTab(box, d) {
    var c = d.community;
    var name = h('input', { placeholder: L('tags.name', 'Tag name'), maxlength: 24, style: 'width:200px;padding:7px 10px;background:var(--bg);border:1px solid var(--border-2)' });
    var color = h('input', { type: 'color', value: '#9d8ad1', 'aria-label': L('tags.color', 'Colour'), class: 'color-input' });
    var msg = h('div', { class: 'err' });
    fill(box,
      h('div', { class: 'panel', style: 'max-width:640px' }, h('h2', { text: L('tags.add', 'Add a tag') }),
        h('div', { class: 'actions', style: 'margin:0' }, name, color, btn('plus', L('manage.add', 'Add'), function () {
          msg.textContent = '';
          call('POST', '/c/' + esc(c.slug) + '/tags', { name: name.value, color: color.value }).then(route).catch(function (e) { msg.textContent = errorText(e.code); });
        })), msg),
      h('div', { class: 'panel', style: 'max-width:640px' }, d.tags.length ? d.tags.map(function (t) {
        return h('div', { class: 'log-row' }, h('span', { class: 'tag', style: tagStyle(t.color), text: t.name }), h('span', { class: 'spacer' }),
          btn('pencil', L('post.edit', 'Edit'), function () {
            ask(L('post.edit', 'Edit'), { action: L('save', 'Save'), fields: [{ name: 'name', label: L('tags.name', 'Tag name'), value: t.name, max: 24 }, { name: 'color', label: L('tags.color', 'Colour'), type: 'color', value: t.color }], run: function (v) { return call('PATCH', '/tags/' + t.id, { name: v.name, color: v.color }).then(route); } });
          }, 'small'),
          btn('trash-2', L('remove.delete', 'Delete'), function () { act(call('DELETE', '/tags/' + t.id)); }, 'small danger'));
      }) : h('div', { class: 'meta', text: L('tags.none', 'No tags yet. Add some so people can sort their topics.') })));
  }
  function modsTab(box, d) {
    var c = d.community, perms = d.perms, slug = esc(c.slug);
    var input = h('input', { placeholder: L('manage.username', 'Username'), maxlength: 64, style: 'width:220px;padding:7px 10px;background:var(--bg);border:1px solid var(--border-2)' });
    var msg = h('div', { class: 'err' });
    fill(box,
      perms.can_manage && h('div', { class: 'panel' }, h('h2', { text: L('manage.add_mod', 'Add a moderator') }), h('div', { class: 'actions', style: 'margin:0' }, input, btn('user-plus', L('manage.add', 'Add'), function () {
        msg.textContent = '';
        call('POST', '/c/' + slug + '/mods', { username: input.value }).then(route).catch(function (e) { msg.textContent = errorText(e.code); });
      })), msg),
      h('div', { class: 'panel' },
        d.owner && h('div', { class: 'person' }, avatar(d.owner, 28), userLink(d.owner), h('span', { class: 'chip accent', text: L('community.owner', 'Owner') })),
        d.mods.length ? d.mods.map(function (m) {
          var me = S.me && m.id === S.me.id;
          return h('div', { class: 'person' }, avatar(m, 28), userLink(m), h('span', { class: 'spacer' }), (perms.can_manage || me) && h('button', { type: 'button', class: 'btn small', text: me ? L('manage.step_down', 'Step down') : L('manage.remove', 'Remove'), onClick: function () { act(call('DELETE', '/c/' + slug + '/mods/' + esc(m.username))); } }));
        }) : h('div', { class: 'meta', style: 'margin-top:6px', text: L('manage.no_mods', 'No moderators yet.') })));
  }
  function bansTab(box, c) {
    var slug = esc(c.slug);
    fill(box, h('div', { class: 'loading', text: L('loading', 'Loading...') }));
    var input = h('input', { placeholder: L('manage.username', 'Username'), maxlength: 64, style: 'width:220px;padding:7px 10px;background:var(--bg);border:1px solid var(--border-2)' });
    get('/c/' + slug + '/bans').then(function (d) {
      fill(box,
        h('div', { class: 'panel' }, h('h2', { text: L('ban.someone', 'Ban someone') }), h('div', { class: 'actions', style: 'margin:0' }, input, btn('user-x', L('ban.action', 'Ban'), function () { if (input.value.trim()) banDialog(c.slug, input.value.trim()); }, 'danger'))),
        h('div', { class: 'panel' }, d.bans.length ? d.bans.map(function (b) {
          return h('div', { class: 'log-row' }, avatar(b.user, 24), userLink(b.user), b.reason && h('span', { class: 'meta', text: b.reason }), h('span', { class: 'meta', text: b.until ? L('ban.until', 'until {when}', { when: fmtDay(b.until) }) : L('ban.forever', 'until lifted') }), h('span', { class: 'spacer' }), h('button', { type: 'button', class: 'btn small', text: L('ban.lift', 'Lift'), onClick: function () { act(call('DELETE', '/c/' + slug + '/bans/' + esc(b.user.username))); } }));
        }) : h('div', { class: 'meta', text: L('ban.none', 'Nobody is banned.') })));
    }).catch(failed);
  }
  var LOG_TEXT = {
    post_removed: ['log.post_removed', 'removed a post'], topic_removed: ['log.topic_removed', 'removed a topic'], post_restored: ['log.post_restored', 'restored a post'], topic_restored: ['log.topic_restored', 'restored a topic'],
    post_approved: ['log.post_approved', 'approved a post'], post_rejected: ['log.post_rejected', 'rejected a post'], post_edited: ['log.post_edited', 'edited a post'],
    topic_pinned: ['log.pinned', 'pinned a topic'], topic_unpinned: ['log.unpinned', 'unpinned a topic'], topic_locked: ['log.locked', 'locked a topic'], topic_unlocked: ['log.unlocked', 'unlocked a topic'], topic_moved: ['log.moved', 'moved a topic'],
    user_banned: ['log.banned', 'banned someone'], user_unbanned: ['log.unbanned', 'lifted a ban'], mod_added: ['log.mod_added', 'added a moderator'], mod_removed: ['log.mod_removed', 'removed a moderator'],
    moderation_open: ['log.mod_open', 'turned review off'], moderation_review: ['log.mod_review', 'turned on holding posts for review'], community_locked: ['log.c_locked', 'made the community read-only'], community_unlocked: ['log.c_unlocked', 'opened the community back up'],
    community_transferred: ['log.transferred', 'handed the community over'], community_removed: ['log.c_removed', 'took the community down'], community_deleted: ['log.c_deleted', 'took the community down'], community_restored: ['log.c_restored', 'brought the community back'],
    topic_announced: ['log.announced', 'made a topic an announcement'], topic_unannounced: ['log.unannounced', 'stopped a topic being an announcement'], tag_added: ['log.tag_added', 'added a tag'], tag_removed: ['log.tag_removed', 'removed a tag'],
    access_changed: ['log.access', 'changed who can post'], allowed_added: ['log.allowed_added', 'added someone to the posting list'], allowed_removed: ['log.allowed_removed', 'removed someone from the posting list'],
    report_resolved: ['log.r_resolved', 'handled a report'], report_dismissed: ['log.r_dismissed', 'dismissed a report'],
  };
  function logTab(box, c) {
    fill(box, h('div', { class: 'loading', text: L('loading', 'Loading...') }));
    get('/c/' + esc(c.slug) + '/log').then(function (d) {
      fill(box, h('div', { class: 'panel' }, d.entries.length ? d.entries.map(function (e) {
        var t = LOG_TEXT[e.action];
        return h('div', { class: 'log-row' }, userLink(e.actor), h('span', { text: t ? L(t[0], t[1]) : e.action }), e.target && [h('span', { class: 'meta', text: '·' }), userLink(e.target)], e.topic_id && link('/t/' + e.topic_id + (e.post_id ? '#p' + e.post_id : ''), null, icon('arrow-up-right')), e.note && h('span', { class: 'meta', text: e.note }), h('span', { class: 'spacer' }), h('span', { class: 'meta', title: fmtDate(e.at), text: ago(e.at) }));
      }) : h('div', { class: 'meta', text: L('log.empty', 'Nothing yet.') })));
    }).catch(failed);
  }

  function profilePage(d) {
    var u = d.user;
    setTitle(u.username);
    fill(main, h('div', { class: 'page' },
      h('div', { class: 'chead' }, avatar(u, 84),
        h('div', { class: 'chead-main' }, h('h1', { text: u.username, style: u.color && /^#[0-9a-f]{6}$/i.test(u.color) ? 'color:' + u.color : null }),
          h('div', { class: 'meta', style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:4px' }, h('span', { class: 'chip', text: rankText(u) }), L('author.posts', 'Posts: {n}', { n: num(u.posts) }), u.joined && L('author.joined', 'Joined: {when}', { when: fmtDay(u.joined) }))),
        h('div', { class: 'chead-actions' }, h('a', { class: 'btn', href: (S.cfg.site || '') + '/u/' + esc(u.username), target: '_blank', rel: 'noopener' }, icon('external-link'), h('span', { text: L('profile.nookara', 'Nookara profile') })),
          S.me && S.me.staff && S.me.id !== u.id && btn('ban', L('staff.ban_all', 'Ban from all forums'), function () {
            ask(L('staff.ban_all', 'Ban from all forums'), { action: L('ban.action', 'Ban'), danger: true, fields: [{ name: 'reason', label: L('ban.reason', 'Reason (shown to them)'), max: 300 }, { name: 'days', label: L('ban.days', 'Days (empty = until you lift it)'), type: 'number', min: 1 }], run: function (v) { return call('POST', '/bans', { username: u.username, reason: v.reason, days: v.days }).then(function () { toast(L('ban.done', 'Banned.')); }); } });
          }, 'danger'))),
      u.signature && h('div', { class: 'panel' }, h('h2', { text: L('profile.signature', 'Signature') }), renderText(u.signature, 3)),
      d.communities.length ? h('div', { class: 'panel' }, h('h2', { text: L('profile.communities', 'Communities they own') }), d.communities.map(function (c) { return h('div', { class: 'person' }, communityIcon(c, 'row-icon'), link('/c/' + esc(c.slug), { text: c.name })); })) : null,
      h('h2', { style: 'margin:14px 0 8px', text: L('profile.topics', 'Recent topics') }),
      d.topics.length ? h('div', { class: 'feed' }, d.topics.map(feedCard)) : h('div', { class: 'empty', style: 'padding:24px' }, h('span', { text: L('profile.no_topics', 'No topics yet.') }))));
  }
  function settingsPage() {
    setTitle(L('menu.settings', 'Signature'));
    if (!S.me) { fill(main, h('div', { class: 'page' }, h('div', { class: 'empty' }, h('b', { text: L('signin.to_post', 'Sign in to post') }), btn('log-in', L('signin.button', 'Sign in'), signIn, 'primary')))); return; }
    var sig = h('textarea', { maxlength: S.cfg.limits.signature || 400, style: 'min-height:90px', value: S.me.signature });
    var preview = h('div', { class: 'sig' });
    function draw() { fill(preview, renderText(sig.value, 3)); }
    sig.addEventListener('input', draw);
    var msg = h('div', { class: 'err' });
    var save = h('button', { type: 'button', class: 'btn primary', text: L('save', 'Save'), disabled: !!S.me.write_block, onClick: function () {
      save.disabled = true;
      call('PATCH', '/me', { signature: sig.value }).then(function (r) { S.me.signature = r.signature; save.disabled = false; msg.textContent = ''; toast(L('saved', 'Saved.')); }).catch(function (e) { save.disabled = false; msg.textContent = errorText(e.code); });
    } });
    fill(main, h('div', { class: 'page', style: 'max-width:620px' },
      blockBanner(),
      h('h1', { style: 'margin-bottom:6px', text: L('menu.settings', 'Signature') }),
      h('p', { class: 'meta', style: 'margin-bottom:14px', text: L('settings.sub', 'Shows under all your posts. Up to 6 lines and one picture from your Nookara storage. Your picture, name and badges come from your Nookara account.') }),
      h('div', { class: 'composer', style: 'margin-top:0' }, sig, preview, msg, h('div', { class: 'actions' }, save))));
    draw();
  }
  function staffPage(d) {
    var cats = d[0].categories, bans = d[1].bans;
    setTitle(L('menu.staff', 'Forum staff tools'));
    if (!S.me || !S.me.staff) return failed({ code: 'not_found' });
    var name = h('input', { placeholder: L('staff.category_name', 'Category name'), maxlength: 60, style: 'width:240px;padding:7px 10px;background:var(--bg);border:1px solid var(--border-2)' });
    var who = h('input', { placeholder: L('manage.username', 'Username'), maxlength: 64, style: 'width:220px;padding:7px 10px;background:var(--bg);border:1px solid var(--border-2)' });
    fill(main, h('div', { class: 'page', style: 'max-width:760px' },
      h('h1', { style: 'margin-bottom:6px', text: L('menu.staff', 'Forum staff tools') }),
      h('p', { class: 'meta', style: 'margin-bottom:14px', text: L('staff.sub', 'Reports sent to Nookara are in the staff panel\'s Queue. In any community you can use its Manage page and every moderator button.') }),
      h('div', { class: 'panel' }, h('h2', { text: L('staff.categories', 'Categories') }),
        cats.map(function (c) { return h('div', { class: 'log-row' }, h('span', { text: c.name }), h('span', { class: 'spacer' }),
          btn('pencil', L('staff.rename', 'Rename'), function () { ask(L('staff.rename', 'Rename'), { action: L('save', 'Save'), fields: [{ name: 'name', label: L('staff.category_name', 'Category name'), value: c.name, max: 60 }], run: function (v) { return call('PATCH', '/categories/' + c.id, { name: v.name }).then(route); } }); }, 'small'),
          !c.staff_only && btn('trash-2', L('remove.delete', 'Delete'), function () { act(call('DELETE', '/categories/' + c.id)); }, 'small danger')); }),
        h('div', { class: 'actions' }, name, btn('plus', L('manage.add', 'Add'), function () { act(call('POST', '/categories', { name: name.value })); }))),
      h('div', { class: 'panel' }, h('h2', { text: L('staff.bans', 'Banned from all forums') }),
        h('div', { class: 'actions', style: 'margin:0 0 8px' }, who, btn('ban', L('ban.action', 'Ban'), function () {
          if (!who.value.trim()) return;
          ask(L('staff.ban_all', 'Ban from all forums'), { action: L('ban.action', 'Ban'), danger: true, fields: [{ name: 'reason', label: L('ban.reason', 'Reason (shown to them)'), max: 300 }, { name: 'days', label: L('ban.days', 'Days (empty = until you lift it)'), type: 'number', min: 1 }], run: function (v) { return call('POST', '/bans', { username: who.value.trim(), reason: v.reason, days: v.days }).then(route); } });
        }, 'danger')),
        bans.length ? bans.map(function (b) { return h('div', { class: 'log-row' }, avatar(b.user, 24), userLink(b.user), b.reason && h('span', { class: 'meta', text: b.reason }), h('span', { class: 'spacer' }), h('button', { type: 'button', class: 'btn small', text: L('ban.lift', 'Lift'), onClick: function () { act(call('DELETE', '/bans/' + esc(b.user.username))); } })); }) : h('div', { class: 'meta', text: L('ban.none', 'Nobody is banned.') }))));
  }
  function searchPage(d, q, page, tag) {
    setTitle(L('search.label', 'Search'));
    fill(main, h('div', { class: 'page', style: 'max-width:820px' },
      h('h1', { style: 'margin-bottom:14px', text: tag ? L('search.tag', 'Topics tagged "{tag}"', { tag: tag }) : L('search.heading', 'Results for "{q}"', { q: q }) }),
      d.communities && d.communities.length ? h('div', { class: 'panel' }, h('h2', { text: L('nav.communities', 'Communities') }), d.communities.map(function (c) { return h('div', { class: 'person' }, communityIcon(c, 'row-icon'), h('div', null, link('/c/' + esc(c.slug), { text: c.name }), h('div', { class: 'meta', text: c.description }))); })) : null,
      d.topics.length ? h('div', { class: 'feed' }, d.topics.map(feedCard)) : h('div', { class: 'empty' }, icon('search-x'), h('b', { text: L('search.none', 'No topics found') })),
      pager(page, d.more, null, function (n) { return '/search?q=' + esc(q) + (tag ? '&tag=' + esc(tag) : '') + '&page=' + n; })));
  }

  function boot() {
    fetch(API + '/config').then(function (r) { return r.json(); }).then(function (c) {
      S.cfg = c;
      return loadMe();
    }).then(function () {
      if (window.veloraI18n) window.veloraI18n.onChange(function () { renderFrame(); });
      renderFrame();
    }).catch(function () {
      main = h('main', { class: 'main' });
      app.replaceChildren(main);
      failed({});
    });
  }
  if (window.withI18n) window.withI18n(boot); else boot();
})();
