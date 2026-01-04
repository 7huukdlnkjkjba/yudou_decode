// ==UserScript==
// @name         玉豆分享自动解析（优化版）
// @namespace    https://github.com/AWangDog/yudou_decode/
// @license      GPLv3
// @version      3.0
// @description  暴力破解玉豆分享密码（性能优化版）
// @author       AWang_Dog & 性能优化
// @match        https://www.yudou6677.top/*.html
// @match        https://www.yudou789.top/*.html
// @icon         https://www.google.com/s2/favicons?sz=64&domain=yudou66.com
// @grant        none
// @downloadURL https://update.greasyfork.org/scripts/557262/%E7%8E%89%E8%B1%86%E5%88%86%E4%BA%AB%E8%87%AA%E5%8A%A8%E8%A7%A3%E6%9E%90%EF%BC%88%E4%BC%98%E5%8C%96%E7%89%88%EF%BC%89.user.js
// @updateURL https://update.greasyfork.org/scripts/557262/%E7%8E%89%E8%B1%86%E5%88%86%E4%BA%AB%E8%87%AA%E5%8A%A8%E8%A7%A3%E6%9E%90%EF%BC%88%E4%BC%98%E5%8C%96%E7%89%88%EF%BC%89.meta.js
// ==/UserScript==

const state = {
    foundPassword: false,
    triedPasswords: new Set(),
    activeWorkers: [],
    maxWorkers: navigator.hardwareConcurrency || 4,
    secretData: null,
    lockCard: null,
    hiddenContent: null
};

const commonPasswords = [
    "0000", "0123", "1111", "1112", "1122", "1133", "1144", "1155", "1166", "1177",
    "1188", "1199", "1222", "1234", "2211", "2222", "2233", "2244", "2255", "2266",
    "2277", "2288", "2299", "2333", "2345", "3311", "3322", "3333", "3344", "3355",
    "3366", "3377", "3388", "3399", "3444", "3456", "4321", "4411", "4422", "4433",
    "4444", "4455", "4466", "4477", "4488", "4499", "4555", "4567", "5511", "5522",
    "5533", "5544", "5555", "5566", "5577", "5588", "5599", "5666", "5678", "6611",
    "6622", "6633", "6644", "6655", "6666", "6677", "6688", "6699", "6777", "6789",
    "7711", "7722", "7733", "7744", "7755", "7766", "7777", "7788", "7799", "7888",
    "8811", "8822", "8833", "8844", "8855", "8866", "8877", "8888", "8899", "8999",
    "9900", "9911", "9922", "9933", "9944", "9955", "9966", "9977", "9988", "9999"
];

const workerCode = `self.onmessage=e=>{const{start,end,secret}=e.data;for(let i=start;i<=end;i++){const pwd=i.toString().padStart(4,'0');try{if(btoa(pwd)===secret){self.postMessage({success:!0,password:pwd});break;}}catch(e){}}self.postMessage({success:!1});}`;

function createWorker() {
    const worker = new Worker(URL.createObjectURL(new Blob([workerCode])));
    state.activeWorkers.push(worker);
    return worker;
}

function cleanupWorkers() {
    state.activeWorkers.forEach(w=>w.terminate());
    state.activeWorkers = [];
}

function tryPassword(pwd) {
    if(state.triedPasswords.has(pwd)||state.foundPassword) return 0;
    state.triedPasswords.add(pwd);
    try {
        if(btoa(pwd)===state.secretData){
            displayResult(pwd);
            return 1;
        }
        return 0;
    } catch(e){return 0;}
}

function displayResult(pwd){
    state.foundPassword=true;
    console.log(`✓ 找到密码: ${pwd}`);
    const input=state.lockCard?.querySelector('.cl-input');
    if(input) input.value=pwd;
    if(state.lockCard&&state.hiddenContent){
        state.lockCard.style.opacity='0';
        setTimeout(()=>{
            state.lockCard.style.display='none';
            state.hiddenContent.style.display='block';
        },300);
    }
    showNotification(`找到密码: ${pwd}`,'success');
    cleanupWorkers();
}

function showNotification(msg,type='info'){
    const el=document.createElement('div');
    el.style.cssText=`position:fixed;top:20px;right:20px;padding:15px 20px;border-radius:5px;color:white;font-weight:bold;z-index:9999;animation:slideIn 0.3s;background:${type==='success'?'#4CAF50':'#2196F3'}`;
    el.textContent=msg;
    document.body.appendChild(el);
    setTimeout(()=>{
        el.style.animation='slideOut 0.3s';
        setTimeout(()=>document.body.removeChild(el),300);
    },3000);
}

async function tryCommonPasswords(){
    console.log('尝试常用密码...');
    for(const pwd of commonPasswords){
        if(state.foundPassword) break;
        if(tryPassword(pwd)===1) return !0;
    }
    return !1;
}

async function bruteForceWithWorkers(){
    console.log(`多线程暴力破解，使用 ${state.maxWorkers} 个Worker`);
    const passwordsPerWorker=Math.ceil(9999/state.maxWorkers);
    const promises=[];
    for(let i=0;i<state.maxWorkers;i++){
        const start=i*passwordsPerWorker;
        const end=Math.min(start+passwordsPerWorker-1,9999);
        promises.push(new Promise(resolve=>{
            const worker=createWorker();
            worker.onmessage=e=>{
                if(e.data.success){
                    displayResult(e.data.password);
                    resolve(!0);
                }else resolve(!1);
            };
            worker.postMessage({start,end,secret:state.secretData});
        }));
    }
    await Promise.all(promises);
    if(!state.foundPassword) showNotification('未找到匹配密码');
}

async function main(){
    console.log('=== 玉豆分享自动解析 ===');
    const wrapper=document.querySelector('.cl-noindent-wrapper');
    if(wrapper){
        state.secretData=wrapper.getAttribute('data-secret');
        state.lockCard=wrapper.querySelector('.cl-lock-card');
        state.hiddenContent=wrapper.querySelector('.cl-hidden-content');
    }
    if(!state.secretData){
        showNotification('未检测到加密数据','error');
        return;
    }
    const style=document.createElement('style');
    style.textContent=`@keyframes slideIn{from{transform:translateX(100%);opacity:0;}to{transform:translateX(0);opacity:1;}}@keyframes slideOut{from{transform:translateX(0);opacity:1;}to{transform:translateX(100%);opacity:0;}}`;
    document.head.appendChild(style);
    if(!await tryCommonPasswords()) await bruteForceWithWorkers();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',main);
else main();
