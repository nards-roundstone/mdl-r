(function(){
  const btn=document.getElementById('helpBtn');
  const pop=document.getElementById('helpSheet');
  const closeBtn=document.getElementById('helpClose');
  if(!btn||!pop) return;
  const open=()=>{pop.hidden=false;btn.setAttribute('aria-expanded','true');};
  const close=()=>{pop.hidden=true;btn.setAttribute('aria-expanded','false');};
  btn.addEventListener('click',e=>{e.preventDefault();open();});
  closeBtn&&closeBtn.addEventListener('click',close);
  pop.addEventListener('click',e=>{if(e.target===pop) close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden) close();});
})();
