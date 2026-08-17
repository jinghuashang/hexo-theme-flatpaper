'use strict';

// ===== 堆叠相册标签(flatpaper 主题内置) =====
// {% stackalbum [容器宽,容器高] %} ![](url ["h"|"v"]) ... {% endstackalbum %}
//   文章内堆叠相册:点击最上层照片抽牌切换,参考澎湃 OS 4 相册。
//   图片方向:title 填 "h"=横屏 / "v"=竖屏;不填则按图片实际比例自动判断。
//   完整展示:object-fit cover 铺满对应方向卡片;下层照片模糊处理。
// {% stackalbumnav %} — 关于页「爱好番剧」版:
//   小缩略图堆叠 + 番剧名字列表,鼠标悬停名字 → 对应封面翻到最上层。
//   数据源:_data/about.yml 的 comic.comic_list(name/href/cover)。
// 样式贴合 flatpaper 纸面风格:暖棕纸阴影、手绘圆角、胶带贴纸、主题色。
// 渐进增强:无 JS 时照片流式可见;JS 初始化后才堆叠。

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// 单张卡:外层定位单元 + 胶带装饰 + 图片
// dir: h=横屏 / v=竖屏 / ''=自动(JS 按图片比例判断)
// referrerpolicy=no-referrer:B 站等图床防盗链会拒带 Referer 的请求
const card = (cls, url, alt, dir) =>
  `<div class="${cls}${dir ? ' ' + cls + '--' + dir : ''}" data-orient="${dir}">` +
  `<span class="fp-tape"></span>` +
  `<img class="fp-img" src="${esc(url)}" alt="${esc(alt)}" loading="lazy" decoding="async" draggable="false" referrerpolicy="no-referrer"></div>`;

hexo.extend.tag.register('stackalbum', function (args, content) {
  const w = parseInt(args[0], 10);
  const h = parseInt(args[1], 10);
  const width = w > 0 ? w : 480;
  const height = h > 0 ? h : 480;

  const imgs = [];
  // ![](url "h") — title 里可带方向标记 h/v
  const re = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const dir = /^[hv]$/i.test(m[3] || '') ? m[3].toLowerCase() : '';
    imgs.push({ alt: m[1] || '', url: m[2], dir });
  }
  if (imgs.length === 0) return '';

  const cards = imgs.map((img) => card('fp-stack__card', img.url, img.alt, img.dir)).join('');

  return `<div class="fp-stack" style="--fp-stack-w:${width}px;--fp-stack-h:${height}px" role="group" aria-label="堆叠相册">${cards}</div>`;
}, { ends: true });

hexo.extend.tag.register('stackalbumnav', function () {
  // hexo 6:_data/*.yml 存入 Data 模型,不再挂 hexo.site.data
  const doc = hexo.model && hexo.model('Data') ? hexo.model('Data').findById('about') : null;
  const about = doc && doc.data;
  const comic = Array.isArray(about) && about[0] ? about[0].comic : null;
  const list = comic && Array.isArray(comic.comic_list) ? comic.comic_list : [];
  if (list.length === 0) return '';

  const cards = list.map((it) =>
    card('fp-stacknav__card', it.cover || '', (it.name || '').trim(), '')
  ).join('');
  const items = list.map((it, i) =>
    `<li><a href="${esc(it.href || '#')}" target="_blank" rel="noopener" data-idx="${i}">${esc((it.name || '').trim())}</a></li>`
  ).join('');

  return `<div class="fp-stacknav"><div class="fp-stacknav__deck" style="--fp-stack-w:160px;--fp-stack-h:160px">${cards}</div><ul class="fp-stacknav__list">${items}</ul></div>`;
});

const CSS = `
/* ---- 堆叠相册:文章版 ---- */
.fp-stack{width:var(--fp-stack-w,480px);max-width:100%;margin:1.6em auto}
.fp-stack__card{display:block;position:relative}
.fp-stack__card--h{width:480px;height:320px}
.fp-stack__card--v{width:320px;height:480px}
.fp-stack__card+.fp-stack__card{margin-top:10px}
.fp-img{display:block;width:100%;height:auto;border-radius:10px;box-shadow:var(--paper-shadow);background:var(--paper);border:1px solid var(--line)}
.fp-tape{display:none}
.fp-stack.is-stacked{position:relative;height:var(--fp-stack-h,480px)}
.fp-stack a:has(> .fp-img),.fp-stacknav__deck a:has(> .fp-img){position:static!important;display:block;width:100%;height:100%}
.fp-stack.is-stacked .fp-stack__card{position:absolute;left:50%;top:50%;width:320px;height:480px;margin:0;cursor:pointer;transition:transform .38s ease,width .3s ease,height .3s ease;will-change:transform;user-select:none;-webkit-user-select:none}
.fp-stack.is-stacked .fp-stack__card--h{width:480px;height:320px}
.fp-stack.is-stacked .fp-stack__card--v{width:320px;height:480px}
.fp-stack.is-stacked .fp-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(3px) saturate(.85);transition:transform .38s ease,filter .3s ease}
.fp-stack.is-stacked .fp-stack__card.is-top .fp-img{filter:none}
.fp-stack.is-stacked .fp-stack__card.is-top:hover .fp-img{filter:brightness(1.05)}
.fp-stack.is-stacked .fp-stack__card.is-taking{transition:transform .26s ease;z-index:9999}
.fp-stack.is-stacked .fp-stack__card.is-taking .fp-img{filter:none;box-shadow:var(--shadow);transition:transform .26s ease,filter .3s ease}
.fp-stack.is-stacked .fp-tape{display:block;position:absolute;top:-9px;left:50%;width:70px;height:19px;z-index:3;transform:translateX(-50%) rotate(-4deg);background-color:var(--tape-yellow);background-image:var(--tape-stripes);filter:saturate(.88);box-shadow:0 1px 3px rgba(var(--paper-shadow-rgb),.18)}
.fp-stack.is-stacked .fp-stack__card:nth-child(odd) .fp-tape{background-color:var(--tape-pink);transform:translateX(-50%) rotate(5deg)}
/* ---- 堆叠相册:关于页番剧版 ---- */
.fp-stacknav{display:flex;align-items:center;gap:24px;margin:1.6em 0;flex-wrap:wrap;flex-direction:row-reverse;justify-content:space-between}
.fp-stacknav__deck{width:var(--fp-stack-w,160px);max-width:100%;flex:0 0 auto}
.fp-stacknav__card{display:block;position:relative}
.fp-stacknav__card--h{width:160px;height:107px}
.fp-stacknav__card--v{width:120px;height:160px}
.fp-stacknav__card+.fp-stacknav__card{margin-top:10px}
.fp-stacknav__deck.is-stacked{position:relative;height:var(--fp-stack-h,160px)}
.fp-stacknav__deck.is-stacked .fp-stacknav__card{position:absolute;left:50%;top:50%;width:120px;height:160px;margin:0;transition:transform .38s ease,width .3s ease,height .3s ease;will-change:transform;user-select:none;-webkit-user-select:none}
.fp-stacknav__deck.is-stacked .fp-stacknav__card--h{width:160px;height:107px}
.fp-stacknav__deck.is-stacked .fp-stacknav__card--v{width:120px;height:160px}
.fp-stacknav__deck.is-stacked .fp-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(2.5px) saturate(.85);transition:transform .38s ease,filter .3s ease}
.fp-stacknav__deck.is-stacked .fp-stacknav__card.is-top .fp-img{filter:none}
.fp-stacknav__deck.is-stacked .fp-tape{display:block;position:absolute;top:-8px;left:50%;width:54px;height:15px;z-index:3;transform:translateX(-50%) rotate(-4deg);background-color:var(--tape-yellow);background-image:var(--tape-stripes);filter:saturate(.88);box-shadow:0 1px 3px rgba(var(--paper-shadow-rgb),.18)}
.fp-stacknav__deck.is-stacked .fp-stacknav__card:nth-child(odd) .fp-tape{background-color:var(--tape-blue);transform:translateX(-50%) rotate(6deg)}
.article-content .fp-stacknav__list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;min-width:200px}
.fp-stacknav__list a{display:block;color:inherit;text-decoration:none;padding:4px 0;border-radius:6px;transition:background .2s ease,color .2s ease}
.fp-stacknav__list a:hover{background:var(--color-accent-soft);color:var(--color-accent-strong)}
@media (max-width:480px){
  .fp-stacknav{
    flex-direction:column;
    flex-wrap:nowrap;
    align-items:center;
    justify-content:flex-start;
    gap:16px;
  }
  .fp-stacknav__deck{
    width:160px;
    max-width:100%;
  }
  .article-content .fp-stacknav__list{
    width:100%;
    min-width:0;
    text-align:center;
  }
  .fp-stacknav__list a{
    overflow-wrap:anywhere;
  }
}
`;

const JS = `
(function(){
  // 主题会把文章图片包进 <a data-fancybox> 用于点击放大;
  // 堆叠区点击要用于翻牌,解除 fancybox 与链接跳转
  function unfancy(card){
    var a=card.querySelector('a');
    if(!a)return;
    a.removeAttribute('data-fancybox');
    a.removeAttribute('data-fancybox-group');
    a.addEventListener('click',function(e){e.preventDefault();});
  }
  // 方向:用户填了 data-orient 用之;没填按图片实际比例
  function applyOrient(card,img,base){
    var o=card.getAttribute('data-orient');
    if(!o)o=(img.naturalWidth||0)>(img.naturalHeight||0)?'h':'v';
    card.classList.toggle(base+'--h',o==='h');
    card.classList.toggle(base+'--v',o==='v');
  }
  function init(stack,cardSel){
    var cards=[].slice.call(stack.querySelectorAll(cardSel));
    if(cards.length<2)return;
    stack.classList.add('is-stacked');
    var n=cards.length;
    var base=cardSel.slice(1);
    var animating=false;
    var scale=1;
    var baseHeight=parseFloat(getComputedStyle(stack).getPropertyValue('--fp-stack-h'))||480;
    for(var k=0;k<n;k++){
      unfancy(cards[k]);
      (function(c){
        var img=c.querySelector('img');
        if(img.complete)applyOrient(c,img,base);
        else img.addEventListener('load',function(){applyOrient(c,img,base);layout();});
      })(cards[k]);
    }
    function cardSize(c){
      return c.classList.contains(base+'--h')?{width:480,height:320}:{width:320,height:480};
    }
    function updateScale(){
      var maxVisualWidth=0;
      for(var i=0;i<n;i++){
        var size=cardSize(cards[i]);
        var angle=Math.min(i*1.6,6)*Math.PI/180;
        var visualWidth=Math.abs(size.width*Math.cos(angle))+Math.abs(size.height*Math.sin(angle));
        maxVisualWidth=Math.max(maxVisualWidth,visualWidth);
      }
      var available=stack.clientWidth;
      var isMobile=window.matchMedia?window.matchMedia('(max-width:480px)').matches:window.innerWidth<=480;
      scale=isMobile&&available>0?Math.min(1,available/maxVisualWidth):1;
      stack.style.height=(baseHeight*scale)+'px';
    }
    function layout(){
      updateScale();
      for(var i=0;i<n;i++){
        var c=cards[i];
        var off=i*10*scale;
        var rot=(i%2===0?1:-1)*Math.min(i*1.6,6);
        c.style.transform='translate(-50%,-50%) translateY('+off+'px) rotate('+rot+'deg) scale('+scale+')';
        c.style.zIndex=String(n-i);
        c.classList.toggle('is-top',i===0);
      }
    }
    function next(){
      if(animating)return;
      animating=true;
      var top=cards[0];
      top.classList.add('is-taking');
      var takingScale=scale*1.05;
      var isMobile=window.matchMedia?window.matchMedia('(max-width:480px)').matches:window.innerWidth<=480;
      if(isMobile)takingScale=Math.min(takingScale,stack.clientWidth/cardSize(top).width);
      top.style.transform='translate(-50%,-50%) translateY('+(-46*scale)+'px) rotate(0deg) scale('+takingScale+')';
      var timer;
      var done=function(e){
        if(e&&e.propertyName!=='transform')return;
        top.removeEventListener('transitionend',done);
        clearTimeout(timer);
        top.classList.remove('is-taking');
        cards.push(cards.shift());
        layout();
        animating=false;
      };
      top.addEventListener('transitionend',done);
      timer=setTimeout(done,700); // 兜底:防 transitionend 丢失
    }
    stack.addEventListener('click',function(e){
      var card=e.target&&e.target.closest?e.target.closest(cardSel):null;
      if(!card||card!==cards[0])return;
      if(!card.classList.contains('is-taking'))next();
    });
    window.addEventListener('resize',function(){if(!animating)layout();});
    layout();
  }
  function initNav(nav){
    var deck=nav.querySelector('.fp-stacknav__deck');
    if(!deck)return;
    var cards=[].slice.call(deck.querySelectorAll('.fp-stacknav__card'));
    if(cards.length<2)return;
    var items=[].slice.call(nav.querySelectorAll('.fp-stacknav__list [data-idx]'));
    if(items.length!==cards.length)return;
    for(var k=0;k<cards.length;k++)unfancy(cards[k]);
    deck.classList.add('is-stacked');
    var n=cards.length;
    var order=cards.slice();
    var baseHeight=parseFloat(getComputedStyle(deck).getPropertyValue('--fp-stack-h'))||160;
    function isMobile(){
      return window.matchMedia?window.matchMedia('(max-width:480px)').matches:window.innerWidth<=480;
    }
    function layout(){
      var mobile=isMobile();
      deck.style.height=mobile?baseHeight+'px':'';
      for(var i=0;i<n;i++){
        var c=cards[i];
        var off=i*6;
        var rot=(i%2===0?1:-1)*Math.min(i*1.2,4);
        c.style.transform='translate(-50%,-50%) translateY('+off+'px) rotate('+rot+'deg)';
        c.style.zIndex=String(n-i);
        c.classList.toggle('is-top',i===0);
      }
      if(!mobile)return;
      var maxRadius=baseHeight/2;
      for(var j=0;j<n;j++){
        var card=cards[j];
        var cardWidth=card.classList.contains('fp-stacknav__card--h')?160:120;
        var cardHeight=card.classList.contains('fp-stacknav__card--h')?107:160;
        var angle=Math.min(j*1.2,4)*Math.PI/180;
        var halfHeight=(Math.abs(cardHeight*Math.cos(angle))+Math.abs(cardWidth*Math.sin(angle)))/2;
        var offset=j*6;
        maxRadius=Math.max(maxRadius,offset+halfHeight,halfHeight-offset);
      }
      deck.style.height=(maxRadius*2)+'px';
    }
    items.forEach(function(a){
      var idx=parseInt(a.getAttribute('data-idx'),10);
      if(isNaN(idx))return;
      a.addEventListener('mouseenter',function(){
        if(cards[0]===cards[idx])return;
        var card=cards.splice(idx,1)[0];
        cards.unshift(card);
        layout();
      });
      a.addEventListener('mouseleave',function(){
        cards.length=0;
        for(var j=0;j<order.length;j++)cards.push(order[j]);
        layout();
      });
    });
    window.addEventListener('resize',layout);
    layout();
  }
  function bindImgRetry(){
    // 兜底:图片加载失败(如 CDN 边缘缓存了旧 403/浏览器缓存)时,
    // 以 no-referrer 重试一次,自愈防盗链类问题
    var imgs=document.querySelectorAll('.fp-img');
    for(var i=0;i<imgs.length;i++){
      var img=imgs[i];
      if(img.getAttribute('data-retried'))continue;
      img.setAttribute('data-retried','1');
      img.addEventListener('error',function(){
        if(this.getAttribute('data-retry'))return;
        this.setAttribute('data-retry','1');
        this.setAttribute('referrerpolicy','no-referrer');
        var src=this.getAttribute('src');
        this.setAttribute('src','');
        this.setAttribute('src',src);
      });
    }
  }
  function fixHotlink(){
    // B 站图床(i0.hdslb.com)防盗链:拒绝带 Referer 的请求,重试需 no-referrer
    var imgs=document.querySelectorAll('img[src*="hdslb.com"],img[src*="hdslb.net"]');
    for(var i=0;i<imgs.length;i++){
      var img=imgs[i];
      if(img.getAttribute('referrerpolicy')==='no-referrer')continue;
      img.setAttribute('referrerpolicy','no-referrer');
      var src=img.getAttribute('src');
      if(img.complete&&img.naturalWidth===0&&src){
        img.setAttribute('src','');
        img.setAttribute('src',src);
      }
    }
  }
  function boot(){
    var s=document.querySelectorAll('.fp-stack');
    for(var i=0;i<s.length;i++)init(s[i],'.fp-stack__card');
    var ns=document.querySelectorAll('.fp-stacknav');
    for(var j=0;j<ns.length;j++)initNav(ns[j]);
    bindImgRetry();
    fixHotlink();
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',boot);}
  else{boot();}
})();
`;

hexo.extend.injector.register('head_end', () => `<style>${CSS}</style>`);
hexo.extend.injector.register('body_end', () => `<script>${JS}</script>`);
