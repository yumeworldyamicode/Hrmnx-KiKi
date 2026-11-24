(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));
  const client = window.supabaseClient;
  const feed = $("kikiMusicFeed");
  const page = $("kikiMusicPage");
  const postView = $("kikiMusicPost");
  const mini = $("kikiMiniPlayer");
  if (!client || !feed || !page || !postView || !mini) return;

  let publications = [];
  let loaded = false;
  let active = null;
  let objectUrls = [];
  let currentAccent = "#d9d4eb";
  if(!document.getElementById("kiki-music-choreo-preview-style")){
    const styleTag=document.createElement("style");
    styleTag.id="kiki-music-choreo-preview-style";
    styleTag.textContent=".kiki-music-card-art{position:relative;overflow:hidden}.kiki-music-choreo-preview{position:absolute;right:7px;bottom:7px;display:flex;align-items:flex-end;justify-content:center;gap:2px;max-width:64%;min-height:32px;padding:5px 7px 4px;background:rgba(255,255,255,.84);border:1px solid rgba(20,20,20,.12);backdrop-filter:blur(4px);border-radius:4px;pointer-events:none}.kiki-music-choreo-preview svg{width:13px;height:23px;display:block;overflow:visible;shape-rendering:geometricPrecision;color:#202020}.kiki-music-choreo-preview svg.bg{color:#999}.kiki-music-choreo-count{align-self:center;margin-left:3px;font-size:8px;font-weight:700;color:#666;white-space:nowrap}.kiki-music-choreo-label{position:absolute;left:7px;bottom:7px;padding:4px 6px;background:#111;color:#fff;font-size:7px;letter-spacing:.7px;pointer-events:none}";
    document.head.appendChild(styleTag);
  }
  function choreoIcon(person){const f=person.gender==="female";return '<svg viewBox="0 0 44 68" aria-hidden="true" class="'+(person.kind==="background"?"bg":"")+'"><g fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="22" cy="8" r="5.5" fill="currentColor" stroke="none"/><path d="M22 16.5v17.5M22 20 11.5 28.5 8.5 20.5M22 20 32.5 28.5 35.5 20.5"/>'+(f?'<path d="M16.2 22.5h11.6l5.1 12.1H11.1Z" fill="currentColor" stroke="none"/>':'<path d="M18 34 17 48 13 62M26 34 27 48 31 62"/>')+'</g>'+(f?'<g fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"><path d="M18.5 34.5 17 48 13 62M25.5 34.5 27 48 31 62"/></g>':'')+'</svg>';}

  function storageCover(item) {
    return item.cover_path
      ? client.storage.from("in-music-artwork").getPublicUrl(item.cover_path).data.publicUrl
      : "";
  }

  function setAccentFromImage(url) {
    return new Promise(resolve => {
      if (!url) return resolve("#d9d4eb");
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 24; canvas.height = 24;
          const context = canvas.getContext("2d", {willReadFrequently:true});
          context.drawImage(image, 0, 0, 24, 24);
          const pixels = context.getImageData(0, 0, 24, 24).data;
          let r=0,g=0,b=0,count=0;
          for(let i=0;i<pixels.length;i+=16){
            if(pixels[i+3] < 100) continue;
            const max=Math.max(pixels[i],pixels[i+1],pixels[i+2]);
            const min=Math.min(pixels[i],pixels[i+1],pixels[i+2]);
            if(max-min < 12 && max > 225) continue;
            r+=pixels[i];g+=pixels[i+1];b+=pixels[i+2];count++;
          }
          if(!count) return resolve("#d9d4eb");
          r=Math.round(r/count);g=Math.round(g/count);b=Math.round(b/count);
          const mix=(value)=>Math.round(value*.72+255*.28);
          resolve("rgb("+mix(r)+","+mix(g)+","+mix(b)+")");
        } catch (_) { resolve("#d9d4eb"); }
      };
      image.onerror = () => resolve("#d9d4eb");
      image.src = url;
    });
  }

  function renderFeed() {
    if (!publications.length) {
      feed.innerHTML = '<div class="kiki-music-state">No public InDesign Music releases yet. Check back soon.</div>';
      return;
    }
    feed.innerHTML = publications.map((item,index) => {
      const cover = storageCover(item);
      const choreo=Array.isArray(item.choreography?.characters)?item.choreography.characters:[];
      const choreoPreview=choreo.length?'<span class="kiki-music-choreo-preview" aria-hidden="true">'+choreo.slice(0,5).map(choreoIcon).join("")+(choreo.length>5?'<span class="kiki-music-choreo-count">+'+(choreo.length-5)+'</span>':'')+'</span><span class="kiki-music-choreo-label">CHOREOGRAPHY</span>':'';
      return '<button class="kiki-music-card" type="button" data-music-open="'+index+'">'+
        '<span class="kiki-music-card-art">'+
          (cover ? '<img src="'+esc(cover)+'" alt="" loading="lazy">' : '<span class="kiki-music-art-placeholder"><span>in.</span></span>')+
          choreoPreview+
          '<span class="kiki-music-card-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 5 12 7-12 7z"/></svg></span>'+
        '</span>'+
        '<span class="kiki-music-card-title">'+esc(item.title || "Untitled")+'</span>'+
        '<span class="kiki-music-card-artist">'+esc(item.artist || "Unknown artist")+'</span>'+
      '</button>';
    }).join("");
  }

  async function loadFeed() {
    if (loaded) return;
    loaded = true;
    feed.innerHTML = '<div class="kiki-music-state">Loading music…</div>';
    try {
      const {data,error} = await client.from("indesign_dems")
        .select("slug,title,artist,description,created_at,cover_path,package_path,owner_id,choreography")
        .eq("visibility","public")
        .eq("is_public",true)
        .order("created_at",{ascending:false})
        .limit(72);
      if (error) throw error;
      publications = data || [];
      renderFeed();
    } catch (error) {
      console.error("KiKi Music feed:",error);
      loaded = false;
      feed.innerHTML = '<div class="kiki-music-state">The Music feed could not load right now. Please try again later.</div>';
    }
  }

  function normalizeCredits(manifest,item) {
    const result = [];
    const production = manifest.production || {};
    const producers = Array.isArray(production.producers) ? production.producers : [];
    producers.forEach(name => { if(name) result.push({role:"Producer",name:String(name)}); });
    const add = (role,value) => {
      if (Array.isArray(value)) value.forEach(entry => {
        if (typeof entry === "string") result.push({role,name:entry});
        else if (entry && typeof entry === "object") result.push({
          role:entry.role || role,
          name:entry.name || entry.display_name || entry.username || entry.artist || ""
        });
      });
      else if (typeof value === "string" && value.trim()) result.push({role,name:value.trim()});
    };
    add("Credits",production.credits);
    add("Credits",manifest.lyrics?.credits);
    add("Contribution",manifest.contributions || item.contributions);
    const seen = new Set();
    return result.filter(entry => {
      if(!entry.name) return false;
      const key=entry.role+"|"+entry.name;
      if(seen.has(key)) return false;
      seen.add(key);return true;
    });
  }

  function lyricHTML(rule,index) {
    const translations = Array.isArray(rule.translations) ? rule.translations : [];
    return '<button type="button" class="kiki-music-lyric" data-lyric-index="'+index+'" data-lyric-time="'+Number(rule.time||0)+'">'+
      '<small>' + esc(rule.section || "LYRICS") + '</small>'+
      '<span class="kiki-music-lyric-original">'+esc(rule.text || "")+'</span>'+
      (rule.romanized ? '<span class="kiki-music-lyric-sub">ROMANIZATION · '+esc(rule.romanized)+'</span>' : '')+
      translations.map(t=>'<span class="kiki-music-lyric-sub">'+esc((t.language || "TRANSLATION").toUpperCase())+' · '+esc(t.text || "")+'</span>').join("")+
      (Array.isArray(rule.adlibs)&&rule.adlibs.length ? '<span class="kiki-music-lyric-sub">AD-LIBS · '+esc(rule.adlibs.join(" / "))+'</span>' : '')+
    '</button>';
  }

  async function findKiKiArtistProfile(name) {
    if (!name) return "";
    try {
      const {data:artist,error} = await client.from("artists").select("id").ilike("name",name).maybeSingle();
      if(error || !artist) return "";
      const {data:profile} = await client.from("profiles").select("username").eq("artist_id",artist.id).maybeSingle();
      return profile?.username ? "profile.html?username="+encodeURIComponent(profile.username) : "";
    } catch (_) { return ""; }
  }

  async function prepareTrack(item) {
    if (active?.item.slug === item.slug && active.audio) return active;
    if (active?.audio) active.audio.pause();
    objectUrls.forEach(url=>URL.revokeObjectURL(url));
    objectUrls=[];
    active=null;
    const {data:blob,error} = await client.storage.from("indesign-dems").download(item.package_path);
    if(error) throw error;
    if(!window.JSZip) throw new Error("The music package reader is unavailable.");
    const zip=await JSZip.loadAsync(blob);
    const manifestFile=zip.file("manifest.json");
    if(!manifestFile) throw new Error("This music package is incomplete.");
    const manifest=JSON.parse(await manifestFile.async("string"));
    const audioName=manifest.assets?.audio;
    const audioFile=audioName ? zip.file("audio/"+audioName) : null;
    if(!audioFile) throw new Error("This release does not contain a playable audio file.");
    const audioBlob=await audioFile.async("blob");
    const audioUrl=URL.createObjectURL(audioBlob);
    objectUrls.push(audioUrl);
    let cover=storageCover(item);
    if(!cover && manifest.assets?.artwork) {
      const artwork=zip.file("artwork/"+manifest.assets.artwork);
      if(artwork) {
        const artBlob=await artwork.async("blob");
        cover=URL.createObjectURL(artBlob);objectUrls.push(cover);
      }
    }
    const rules=(manifest.lyrics?.rules || []).slice().sort((a,b)=>Number(a.time||0)-Number(b.time||0));
    const audio=new Audio(audioUrl);
    audio.preload="metadata";
    active={item,manifest,audio,cover,rules,accent:"#d9d4eb"};
    active.accent=await setAccentFromImage(cover);
    currentAccent=active.accent;
    document.documentElement.style.setProperty("--kiki-music-accent",currentAccent);
    return active;
  }

  function fmt(seconds) {
    if(!Number.isFinite(seconds)) return "0:00";
    return Math.floor(seconds/60)+":"+String(Math.floor(seconds%60)).padStart(2,"0");
  }

  function renderMini() {
    if(!active) { mini.hidden=true;return; }
    mini.hidden=false;
    $("kikiMiniCover").src=active.cover || "";
    $("kikiMiniTitle").textContent=active.item.title || "Untitled";
    $("kikiMiniArtist").textContent=active.item.artist || "Unknown artist";
    $("kikiMiniPlay").textContent=active.audio.paused ? "▶" : "Ⅱ";
    $("kikiMiniProgress").style.width=active.audio.duration ? (active.audio.currentTime/active.audio.duration*100)+"%" : "0%";
    $("kikiMiniSeek").value=active.audio.duration ? Math.round(active.audio.currentTime/active.audio.duration*1000) : 0;
    $("kikiMiniTime").textContent=fmt(active.audio.currentTime);
    $("kikiMiniDuration").textContent=fmt(active.audio.duration);
  }

  function renderLyrics() {
    if(!active) return;
    const rules=active.rules;
    let current=-1;
    rules.forEach((rule,index)=>{if(Number(rule.time||0)<=active.audio.currentTime) current=index;});
    const preview=$("kikiMusicLyricsPreview");
    if(preview) {
      const rule=rules[current];
      preview.innerHTML=rule
        ? '<small>'+esc(rule.section || "LYRICS")+'</small><strong>'+esc(rule.text || "")+'</strong>'+
          (rule.romanized?'<span>'+esc(rule.romanized)+'</span>':'')
        : '<span class="kiki-music-lyrics-empty">Play the track to follow its synced lyrics.</span>';
    }
    const full=$("kikiMusicLyricsFull");
    if(full) {
      const previousIndex=full.dataset.activeIndex;
      full.querySelectorAll("[data-lyric-index]").forEach((line,index)=>{
        const isCurrent=index===current;
        line.classList.toggle("active",isCurrent);
        if(isCurrent && full.dataset.autoScroll==="true" && previousIndex!==String(current)) line.scrollIntoView({block:"nearest",behavior:"smooth"});
      });
      full.dataset.activeIndex=String(current);
    }
    renderMini();
  }

  function renderPost(item,track) {
    const manifest=track.manifest;
    const title=manifest.title || item.title || "Untitled";
    const artist=manifest.artist || item.artist || "Unknown artist";
    const credits=normalizeCredits(manifest,item);
    const creditHTML=credits.length ? credits.map(c=>'<div class="kiki-music-credit"><span>'+esc(c.role)+'</span><strong>'+esc(c.name)+'</strong></div>').join("") : '<p class="kiki-music-credit-empty">No additional credits have been supplied.</p>';
    const rules=track.rules;
    postView.style.setProperty("--post-accent",track.accent);
    postView.innerHTML=
      '<div class="kiki-music-post-scroll">'+
        '<header class="kiki-music-post-top"><button type="button" class="kiki-music-back" id="kikiMusicBack">← <span>Music</span></button><span>KiKi MUSIC</span></header>'+
        '<section class="kiki-music-post-hero">'+
          (track.cover?'<img class="kiki-music-post-cover" src="'+esc(track.cover)+'" alt="'+esc(title)+' cover">':'<div class="kiki-music-post-cover kiki-music-art-placeholder"><span>in.</span></div>')+
          '<div class="kiki-music-post-meta"><p class="kiki-music-post-eyebrow">NOW PLAYING</p><h1>'+esc(title)+'</h1><a href="#" class="kiki-music-artist-link" id="kikiMusicArtist">'+esc(artist)+'</a></div>'+
        '</section>'+
        '<section class="kiki-music-controls"><button type="button" id="kikiMusicPlay" aria-label="Play or pause">▶</button><input id="kikiMusicSeek" type="range" min="0" max="1000" value="0" aria-label="Seek through track"><span id="kikiMusicClock">0:00 / 0:00</span></section>'+
        '<section class="kiki-music-lyrics-section"><div class="kiki-music-section-heading"><div><small>FOLLOW ALONG</small><h2>Lyrics</h2></div><button type="button" id="kikiMusicLyricsToggle">View full lyrics</button></div>'+
          '<button type="button" class="kiki-music-lyrics-preview" id="kikiMusicLyricsPreview"><span class="kiki-music-lyrics-empty">Play the track to follow its synced lyrics.</span></button>'+
          '<div class="kiki-music-lyrics-full" id="kikiMusicLyricsFull" hidden data-auto-scroll="true">'+
            (rules.length?rules.map((r,i)=>lyricHTML(r,i)).join(""):'<p class="kiki-music-credit-empty">No synced lyrics are available for this release.</p>')+
          '</div>'+
        '</section>'+
        '<section class="kiki-music-credits"><small>CREDITS</small><h2>Behind the music</h2>'+creditHTML+'</section>'+
        '<a class="kiki-music-powered" href="https://nemawashi.hrmnx.site/app/in-music/post.html?id='+encodeURIComponent(item.slug)+'" target="_blank" rel="noopener"><span>Play in</span><strong>in. music</strong><svg class="kiki-music-powered-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></svg></a>'+
      '</div>';
    postView.hidden=false;
    requestAnimationFrame(()=>postView.classList.add("is-open"));
    $("kikiMusicBack").addEventListener("click",closePost);
    $("kikiMusicPlay").addEventListener("click",togglePlay);
    $("kikiMusicLyricsToggle").addEventListener("click",()=>{
      const box=$("kikiMusicLyricsFull"),open=box.hidden;
      box.hidden=!open;
      box.dataset.autoScroll="true";
      if(open) delete box.dataset.activeIndex;
      $("kikiMusicLyricsToggle").textContent=open?"Hide full lyrics":"View full lyrics";
      if(open) renderLyrics();
    });
    $("kikiMusicLyricsFull").addEventListener("click",event=>{
      const line=event.target.closest("[data-lyric-time]");
      if(!line)return;
      track.audio.currentTime=Number(line.dataset.lyricTime||0);
      track.audio.play().catch(()=>{});
    });
    $("kikiMusicLyricsPreview").addEventListener("click",()=>{
      $("kikiMusicLyricsFull").hidden=false;
      delete $("kikiMusicLyricsFull").dataset.activeIndex;
      $("kikiMusicLyricsToggle").textContent="Hide full lyrics";
      renderLyrics();
    });
    $("kikiMusicSeek").addEventListener("input",event=>{
      if(track.audio.duration) track.audio.currentTime=track.audio.duration*Number(event.target.value)/1000;
    });
    $("kikiMusicArtist").addEventListener("click",async event=>{
      event.preventDefault();
      const href=await findKiKiArtistProfile(artist);
      if(href) {
        if(window.parent && window.parent!==window) window.parent.postMessage({type:"kiki-load-page",url:href},"*");
        else location.href=href;
      } else {
        $("kikiMusicArtist").classList.add("is-unlinked");
        $("kikiMusicArtist").title="This artist does not have a linked KiKi artist profile yet.";
      }
    });
    track.audio.ontimeupdate=()=>{
      const seek=$("kikiMusicSeek"),clock=$("kikiMusicClock");
      if(seek && track.audio.duration) seek.value=Math.round(track.audio.currentTime/track.audio.duration*1000);
      if(clock) clock.textContent=fmt(track.audio.currentTime)+" / "+fmt(track.audio.duration);
      renderLyrics();
    };
    track.audio.onplay=()=>{
      const button=$("kikiMusicPlay");if(button)button.textContent="Ⅱ";
      renderMini();
    };
    track.audio.onpause=()=>{
      const button=$("kikiMusicPlay");if(button)button.textContent="▶";
      renderMini();
    };
    track.audio.onended=()=>{
      const button=$("kikiMusicPlay");if(button)button.textContent="▶";
      renderLyrics();
    };
    renderMini();renderLyrics();
    if(track.audio.duration) $("kikiMusicClock").textContent="0:00 / "+fmt(track.audio.duration);
    track.audio.addEventListener("loadedmetadata",()=>{
      const clock=$("kikiMusicClock");if(clock)clock.textContent="0:00 / "+fmt(track.audio.duration);
      renderMini();
    },{once:true});
  }

  async function openPost(index) {
    const item=publications[index];
    if(!item) return;
    postView.hidden=false;
    postView.classList.remove("is-open");
    postView.innerHTML='<div class="kiki-music-post-loading">Opening music post…</div>';
    try {
      const track=await prepareTrack(item);
      renderPost(item,track);
      renderMini();
    } catch(error) {
      console.error("KiKi Music post:",error);
      postView.innerHTML='<div class="kiki-music-post-loading"><p>Could not open this music post.</p><button type="button" id="kikiMusicBack">Back to music</button></div>';
      $("kikiMusicBack").addEventListener("click",closePost);
      postView.classList.add("is-open");
    }
  }

  function closePost() {
    postView.classList.remove("is-open");
    setTimeout(()=>{if(!postView.classList.contains("is-open"))postView.hidden=true;},420);
  }

  function togglePlay() {
    if(!active?.audio) return;
    if(active.audio.paused) active.audio.play().catch(error=>console.warn("KiKi playback:",error));
    else active.audio.pause();
  }

  feed.addEventListener("click",event=>{
    const card=event.target.closest("[data-music-open]");
    if(card) openPost(Number(card.dataset.musicOpen));
  });
  $("kikiMusicMiniOpen").addEventListener("click",()=>{
    if(active){const index=publications.findIndex(item=>item.slug===active.item.slug);if(index>=0)openPost(index);}
  });
  $("kikiMiniPlay").addEventListener("click",togglePlay);
  $("kikiMiniSeek").addEventListener("input",event=>{
    if(active?.audio.duration) active.audio.currentTime=active.audio.duration*Number(event.target.value)/1000;
  });
  active=null;
  window.addEventListener("pagehide",()=>objectUrls.forEach(url=>URL.revokeObjectURL(url)),{once:true});

  document.querySelectorAll("[data-kiki-feed]").forEach(button=>{
    button.addEventListener("click",()=>{
      const music=button.dataset.kikiFeed==="music";
      document.body.classList.toggle("kiki-music-mode",music);
      document.querySelectorAll("[data-kiki-feed]").forEach(b=>{b.classList.toggle("active",b===button);b.setAttribute("aria-selected",String(b===button));});
      if(music) loadFeed();
      else closePost();
    });
  });
})();