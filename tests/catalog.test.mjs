import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
test('category links, filtering, invalid category fallback and browser back stay consistent',()=>{
 const html=readFileSync(new URL('../catalog/index.html',import.meta.url),'utf8');
 const buttons=[...html.matchAll(/data-filter="([^"]+)"/g)].map(match=>({dataset:{filter:match[1]},setAttribute(key,value){this[key]=value},addEventListener(_,fn){this.click=fn}}));
 const cards=[...html.matchAll(/class="project" data-category="([^"]+)"/g)].map(match=>({dataset:{category:match[1]}}));
 assert.equal(cards.length,17);assert.equal(html.includes('rick-and-morty'),false);
 const result={};const location={href:'https://memorim.github.io/memorim/?category=backend',search:'?category=backend'};const events={};
 const context={URL,URLSearchParams,location,history:{pushState(_a,_b,url){location.href=url.href;location.search=url.search}},window:{addEventListener(name,fn){events[name]=fn}},document:{querySelectorAll(selector){return selector==='[data-filter]'?buttons:cards},querySelector(){return result}}};
 vm.runInNewContext(readFileSync(new URL('../catalog/app.js',import.meta.url),'utf8'),context);
 assert.ok(cards.some(card=>card.hidden));assert.ok(cards.filter(card=>!card.hidden).every(card=>card.dataset.category.split(' ').includes('backend')));
 buttons.find(button=>button.dataset.filter==='design').click();assert.equal(cards.filter(card=>!card.hidden).length,3);
 location.search='?category=missing';events.popstate();assert.equal(cards.filter(card=>!card.hidden).length,17);
 buttons[0].click();assert.equal(location.search,'');assert.equal(buttons[0]['aria-pressed'],'true');
});
