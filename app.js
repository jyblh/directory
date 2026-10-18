'use strict';
// 貼上獨立 Apps Script 網頁應用程式 /exec 網址；不得放入任何私密金鑰。
const API_URL = 'https://script.google.com/a/macros/ntutjob.org/s/AKfycbxWu8Il6lm26ExJ0QWdrfcutnXecvfzrPJn9lghdQDfwgwIwLjCULwQ4iDrnXa_TC6i/exec';
const INDUSTRIES=['電子資訊','半導體','製造工程','金融保險','顧問服務','營建建築','零售服務','其他'];
const DEPARTMENTS=['不限科系','電機工程','電子工程','資訊工程','機械工程','材料工程','化學工程','土木工程','建築設計','工業設計','經營管理','資訊管理','工業工程','能源工程','人文社會','其他'];
const $=id=>document.getElementById(id);
let industry='', departments=[], status='未填寫';
const DRAFT_KEY='ntut_directory_v7_local_draft';
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const setMessage=(id,msg,error=false)=>{const el=$(id);el.textContent=msg;el.classList.toggle('error',error);};
function callApi(action,params={}){
  return new Promise((resolve,reject)=>{
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(API_URL))return reject(new Error('請先在 app.js 設定 Apps Script /exec 網址'));
    const requestId=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random());
    const iframe=make('iframe');iframe.style.display='none';iframe.name='api_'+requestId.replace(/[^\w]/g,'');
    const form=make('form');form.method='POST';form.action=API_URL;form.target=iframe.name;form.style.display='none';
    const values={action,requestId,...params};
    Object.entries(values).forEach(([key,value])=>{const input=make('input');input.name=key;input.value=String(value??'');form.appendChild(input);});
    let done=false;
    const finish=(err,data)=>{if(done)return;done=true;clearTimeout(timer);window.removeEventListener('message',onMessage);form.remove();iframe.remove();err?reject(err):resolve(data);};
    const onMessage=event=>{
      // Google Apps Script HTML Service runs inside a googleusercontent.com sandbox.
      // Check both requestId and message type; never accept messages from arbitrary sites.
      // Apps Script HTML Service may use a nested sandbox iframe; verify origin and requestId below.
      if(!/^https:\/\/([a-z0-9-]+\.)*googleusercontent\.com$/i.test(event.origin))return;
      let payload=event.data;
      if(typeof payload==='string'){try{payload=JSON.parse(payload);}catch{return;}}
      if(!payload||payload.type!=='NTUT_DIRECTORY_API'||payload.requestId!==requestId)return;
      finish(payload.ok?null:new Error(payload.error||'後台處理失敗'),payload);
    };
    const timer=setTimeout(()=>finish(new Error('後台回應逾時。請確認部署權限、前端網址及網路連線。')),30000);
    window.addEventListener('message',onMessage);document.body.append(iframe,form);form.submit();
  });
}
function lockButton(id,active){$(id).disabled=active;}
function renderChips(id,values,selected,handler){const root=$(id);root.replaceChildren();values.forEach(v=>{const b=make('button','chip'+(selected.includes(v)?' selected':''),v);b.type='button';b.setAttribute('aria-pressed',selected.includes(v)?'true':'false');b.onclick=()=>handler(v);root.appendChild(b);});}
function chips(){renderChips('industries',INDUSTRIES,industry?[industry]:[],v=>{industry=v;chips();render();});renderChips('departments',DEPARTMENTS,departments,v=>{if(v==='不限科系'){departments=['不限科系'];}else{departments=departments.filter(x=>x!=='不限科系');departments=departments.includes(v)?departments.filter(x=>x!==v):[...departments,v];if(departments.length>6){departments=['不限科系'];setMessage('saveMsg','需求科系超過 6 項，已自動切換為「不限科系」。');}}chips();render();});}
function jobEditor(container,prefix,index){const card=make('div','job');card.append(make('div','job-title',`職缺 ${index+1}`));[['title','職缺名稱','例：軟體工程師'],['description','工作內容','請簡述職務內容'],['salary','薪資待遇','例：月薪 40,000 元起']].forEach(([key,label,placeholder])=>{const wrap=make('label','',label);const el=key==='description'?make('textarea'):make('input');el.id=`${prefix}${index}_${key}`;el.placeholder=placeholder;if(key==='description')el.rows=3;el.maxLength=key==='description'?300:key==='salary'?100:80;el.addEventListener('input',render);wrap.append(el);card.append(wrap);});container.append(card);}
for(const [id,prefix] of [['internships','intern'],['fulltime','full']])for(let i=0;i<2;i++)jobEditor($(id),prefix,i);
function readJobs(prefix){return [0,1].map(i=>({title:$(`${prefix}${i}_title`).value,description:$(`${prefix}${i}_description`).value,salary:$(`${prefix}${i}_salary`).value})).filter(j=>j.title||j.description||j.salary);}
function collect(){return {companyName:$('companyName').value.trim(),tax:$('tax').value.trim(),email:$('email').value.trim(),industry,departments,intro:$('intro').value,benefits:$('benefits').value,recruitUrl:$('recruitUrl').value,internships:readJobs('intern'),fulltime:readJobs('full')};}
function populate(d){industry=d.industry||'';departments=Array.isArray(d.departments)?d.departments:[];for(const id of ['companyName','tax','email','intro','benefits','recruitUrl'])$(id).value=d[id]||'';for(const [prefix,items] of [['intern',d.internships||[]],['full',d.fulltime||[]]])for(let i=0;i<2;i++)for(const k of ['title','description','salary'])$(`${prefix}${i}_${k}`).value=items[i]?.[k]||'';chips();}
function addText(parent,tag,cls,value){parent.append(make(tag,cls,value||'尚未填寫'));}
function printSection(root,title,body){const section=make('div','print-section');section.append(make('h3','',title));section.append(make('p','',body||'尚未填寫'));root.append(section);}
function render(){const d=collect();$('introCount').textContent=`${d.intro.length} / 150`;$('benefitsCount').textContent=`${d.benefits.length} / 200`;
  const paper=$('previewPrint');paper.replaceChildren();const head=make('div','print-head');head.append(make('h2','',$('companyName').value||'企業名稱'));const qr=make('div','print-qr');if(/^https?:\/\//i.test(d.recruitUrl)){const img=make('img');img.alt='徵才資訊 QR Code';img.src='https://api.qrserver.com/v1/create-qr-code/?size=160x160&data='+encodeURIComponent(d.recruitUrl);qr.append(img);}qr.append(make('span','','掃描查看徵才資訊'));head.append(qr);paper.append(head);
  const tags=make('div','print-tags');[d.industry,...d.departments].filter(Boolean).forEach(v=>tags.append(make('span','',v)));paper.append(tags);
  printSection(paper,'企業簡介',d.intro);printSection(paper,'福利制度',d.benefits);
  for(const [title,jobs] of [['實習職缺',d.internships],['正職職缺',d.fulltime]]){const sec=make('div','print-section');sec.append(make('h3','',title));if(!jobs.length)sec.append(make('p','','尚未填寫'));jobs.forEach(j=>{const item=make('div','print-job');item.append(make('b','',j.title||'未命名職缺'));item.append(make('div','',j.description||''));item.append(make('div','','待遇：'+(j.salary||'未填寫')));sec.append(item);});paper.append(sec);}
  const web=$('previewWeb');web.replaceChildren();const card=make('div','web-card'),banner=make('div','banner');banner.append(make('div','eyebrow','一見傾薪 · 2027 SPRING'));banner.append(make('h2','',$('companyName').value||'企業名稱'));card.append(banner);const content=make('div','content');[d.industry,...d.departments].filter(Boolean).forEach(v=>content.append(make('span','tag',v)));for(const [title,body] of [['關於我們',d.intro],['福利與制度',d.benefits]]){content.append(make('h3','',title));content.append(make('p','',body||'尚未填寫'));}for(const [title,jobs] of [['實習機會',d.internships],['正職機會',d.fulltime]]){content.append(make('h3','',title));if(!jobs.length)content.append(make('p','','尚未填寫'));jobs.forEach(j=>{const item=make('div','webjob');item.append(make('strong','',j.title||'未命名職缺'));item.append(make('p','',j.description||''));item.append(make('span','','待遇：'+(j.salary||'未填寫')));content.append(item);});}if(/^https?:\/\//i.test(d.recruitUrl)){const a=make('a','','查看企業徵才資訊 →');a.href=d.recruitUrl;a.target='_blank';a.rel='noopener noreferrer';content.append(a);}card.append(content);web.append(card);
}
for(const id of ['intro','benefits','recruitUrl'])$(id).addEventListener('input',render);
function tab(which){$('tabPrint').classList.toggle('active',which==='print');$('tabWeb').classList.toggle('active',which==='web');$('previewPrint').hidden=which!=='print';$('previewWeb').hidden=which!=='web';}
$('tabPrint').onclick=()=>tab('print');$('tabWeb').onclick=()=>tab('web');
function validateBeforeSubmit(d){
  if(!/^\d{8}$/.test(d.tax))throw Error('請輸入 8 位數統一編號');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))throw Error('請輸入有效的報名 Email');
  if(!d.companyName)throw Error('請填寫企業名稱');
  if(!d.industry)throw Error('請選擇產業類別');
  if(!d.intro)throw Error('請填寫企業簡介');
  if(d.recruitUrl&&!/^https?:\/\//i.test(d.recruitUrl))throw Error('徵才網址請以 https:// 開頭');
}
function saveLocal(){try{localStorage.setItem(DRAFT_KEY,JSON.stringify({savedAt:new Date().toISOString(),data:collect()}));setMessage('saveMsg','本機草稿已儲存（僅限目前瀏覽器）。');}catch(e){setMessage('saveMsg','瀏覽器不允許本機儲存，請直接送出。',true);}}
$('saveDraft').onclick=saveLocal;
$('submit').onclick=async()=>{
  const d=collect();try{validateBeforeSubmit(d);}catch(e){setMessage('saveMsg',e.message,true);return;}
  if(!confirm('確定送出企業名冊？\n本次將新增一筆提交紀錄，若需修改請重新填寫並送出。'))return;
  lockButton('submit',true);setMessage('saveMsg','正在提交，請勿重複點擊…');
  try{const r=await callApi('submit',{data:JSON.stringify(d)});status='已送出';setMessage('saveMsg','提交成功！提交編號：'+r.submissionId+'｜第 '+r.version+' 版。請保留此編號。');$('saveMsg').classList.add('success');try{localStorage.removeItem(DRAFT_KEY);}catch(_){} }
  catch(e){setMessage('saveMsg',e.message+'。若不確定是否成功，請先洽主辦單位確認，避免重複提交。',true);}
  finally{lockButton('submit',false);}
};
for(const id of ['companyName','tax','email'])$(id).addEventListener('input',render);
try{const saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(saved?.data)populate(saved.data);}catch(e){}
chips();render();
