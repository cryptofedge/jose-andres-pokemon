// ── Translations ─────────────────────────────────────────────────
const LANGS = {
  en: { flag:'🇺🇸', label:'English' },
  es: { flag:'🇪🇸', label:'Español' },
  fr: { flag:'🇫🇷', label:'Français' },
  pt: { flag:'🇧🇷', label:'Português' },
  yo: { flag:'🇳🇬', label:'Yorùbá' },
  zh: { flag:'🇨🇳', label:'中文' },
  ar: { flag:'🇸🇦', label:'العربية' },
};

const T = {
  // NAV
  nav_home:    { en:'Home',    es:'Inicio',  fr:'Accueil', pt:'Início',  yo:'Ile',    zh:'主页',   ar:'الرئيسية' },
  nav_team:    { en:'My Team', es:'Mi Equipo',fr:'Mon Équipe',pt:'Meu Time',yo:'Ẹgbẹ mi',zh:'我的队伍',ar:'فريقي' },
  nav_gallery: { en:'Gallery', es:'Galería', fr:'Galerie', pt:'Galeria', yo:'Aworan', zh:'相册',   ar:'معرض' },
  nav_updates: { en:'Updates', es:'Noticias',fr:'Actus',   pt:'Novidades',yo:'Iroyin', zh:'动态',   ar:'الأخبار' },

  // HERO
  hero_badge:  { en:'Pokemon Trainer', es:'Entrenador Pokémon', fr:'Dresseur Pokémon', pt:'Treinador Pokémon', yo:'Olukọni Pokémon', zh:'宝可梦训练师', ar:'مدرب بوكيمون' },
  hero_h2a:    { en:'Welcome to My',   es:'Bienvenido a Mi',    fr:'Bienvenue dans Mon', pt:'Bem-vindo ao Meu', yo:'Kaabo si',      zh:'欢迎来到我的',  ar:'مرحباً في' },
  hero_h2b:    { en:'Pokemon World!',  es:'¡Mundo Pokémon!',    fr:'Monde Pokémon !', pt:'Mundo Pokémon!', yo:'Aye Pokémon!',   zh:'宝可梦世界！', ar:'عالم بوكيمون!' },
  hero_sub:    { en:'I love Pokemon! Check out my team, my pics, and everything Pokemon!', es:'¡Me encanta Pokémon! ¡Mira mi equipo, mis fotos y todo sobre Pokémon!', fr:'J\'adore Pokémon ! Découvrez mon équipe, mes photos et tout sur Pokémon !', pt:'Eu amo Pokémon! Veja meu time, minhas fotos e tudo sobre Pokémon!', yo:'Mo nifẹ Pokémon! Wo ẹgbẹ mi, aworan mi, ati ohun gbogbo nipa Pokémon!', zh:'我爱宝可梦！看看我的队伍、我的照片和一切宝可梦！', ar:'أحب بوكيمون! تحقق من فريقي وصوري وكل شيء عن بوكيمون!' },
  stat_caught: { en:'Pokemon Caught', es:'Pokémon Atrapados', fr:'Pokémon Capturés', pt:'Pokémon Capturados', yo:'Pokémon Mu', zh:'抓到的宝可梦', ar:'بوكيمون محتجز' },
  stat_photos: { en:'Photos',  es:'Fotos',  fr:'Photos',  pt:'Fotos',  yo:'Aworan', zh:'照片',  ar:'صور' },
  stat_updates:{ en:'Updates', es:'Noticias',fr:'Actus',  pt:'Novidades',yo:'Iroyin',zh:'动态',  ar:'تحديثات' },

  // SECTIONS
  sec_team_h:  { en:'My Pokemon Team',   es:'Mi Equipo Pokémon',     fr:'Mon Équipe Pokémon',    pt:'Meu Time Pokémon',     yo:'Ẹgbẹ Pokémon mi',    zh:'我的宝可梦队伍',  ar:'فريق بوكيمون' },
  sec_team_s:  { en:'These are my best Pokemon!', es:'¡Estos son mis mejores Pokémon!', fr:'Voici mes meilleurs Pokémon !', pt:'Esses são meus melhores Pokémon!', yo:'Àwọn Pokémon tí ó dára jù mi!', zh:'这些是我最好的宝可梦！', ar:'هؤلاء هم أفضل بوكيمون لدي!' },
  sec_gal_h:   { en:'My Gallery',        es:'Mi Galería',            fr:'Ma Galerie',            pt:'Minha Galeria',        yo:'Aworan Mi',          zh:'我的相册',      ar:'معرضي' },
  sec_gal_s:   { en:'Photos from my Pokemon adventures!', es:'¡Fotos de mis aventuras Pokémon!', fr:'Photos de mes aventures Pokémon !', pt:'Fotos das minhas aventuras Pokémon!', yo:'Aworan lati inu irin-ajo Pokémon mi!', zh:'我的宝可梦冒险照片！', ar:'صور من مغامرات بوكيمون!' },
  sec_post_h:  { en:'Latest Updates',    es:'Últimas Noticias',      fr:'Dernières Actus',       pt:'Últimas Novidades',    yo:'Iroyin Tuntun',      zh:'最新动态',      ar:'آخر الأخبار' },
  sec_post_s:  { en:'What Jose Andres has been up to!', es:'¡Lo que ha estado haciendo Jose Andres!', fr:'Ce que Jose Andres a fait !', pt:'O que Jose Andres tem feito!', yo:'Ohun tí Jose Andres ti ń ṣe!', zh:'Jose Andres最近在做什么！', ar:'ما الذي فعله José Andres!' },

  // HEADER BUTTONS
  btn_login:   { en:'🔑 Login', es:'🔑 Entrar', fr:'🔑 Connexion', pt:'🔑 Entrar', yo:'🔑 Wọlé', zh:'🔑 登录', ar:'🔑 دخول' },
  btn_join:    { en:'⭐ Join',  es:'⭐ Unirse', fr:'⭐ Rejoindre', pt:'⭐ Entrar',  yo:'⭐ Darapọ mọ', zh:'⭐ 加入', ar:'⭐ انضم' },

  // MODALS
  invite_title:{ en:'Exclusive Access', es:'Acceso Exclusivo', fr:'Accès Exclusif', pt:'Acesso Exclusivo', yo:'Wọle Pataki', zh:'专属入场', ar:'وصول حصري' },
  invite_sub:  { en:"This is Jose's private Pokemon World.<br/>You need a special invite code to join!", es:"Este es el mundo privado Pokémon de Jose.<br/>¡Necesitas un código de invitación especial para unirte!", fr:"C'est le monde Pokémon privé de Jose.<br/>Vous avez besoin d'un code d'invitation spécial pour rejoindre !", pt:"Este é o mundo Pokémon privado de Jose.<br/>Você precisa de um código de convite especial para entrar!", yo:"Eyi ni aye aladani Pokémon ti Jose.<br/>O nilo koodu ìpè pataki lati darapọ mọ!", zh:"这是Jose的私人宝可梦世界。<br/>您需要特殊邀请码才能加入！", ar:"هذا هو عالم بوكيمون الخاص بـ José.<br/>تحتاج إلى رمز دعوة خاص للانضمام!" },
  invite_ph:   { en:'Enter your invite code…', es:'Ingresa tu código de invitación…', fr:'Entrez votre code d\'invitation…', pt:'Digite seu código de convite…', yo:'Tẹ koodu ìpè rẹ sii…', zh:'输入您的邀请码…', ar:'أدخل رمز الدعوة…' },
  invite_btn:  { en:'⭐ Enter the World', es:'⭐ Entrar al Mundo', fr:'⭐ Entrer dans le Monde', pt:'⭐ Entrar no Mundo', yo:'⭐ Wọlé si Aye', zh:'⭐ 进入世界', ar:'⭐ ادخل العالم' },
  login_title: { en:'Welcome Back!', es:'¡Bienvenido de nuevo!', fr:'Bon retour !', pt:'Bem-vindo de volta!', yo:'Ẹ káàbọ̀ padà!', zh:'欢迎回来！', ar:'مرحباً بعودتك!' },
  login_sub:   { en:"Log in to Jose's Pokemon World", es:"Iniciar sesión en el Mundo Pokémon de Jose", fr:"Se connecter au monde Pokémon de Jose", pt:"Entrar no Mundo Pokémon de Jose", yo:"Wọlé si Aye Pokémon Jose", zh:"登录Jose的宝可梦世界", ar:"تسجيل الدخول إلى عالم بوكيمون José" },
  login_btn:   { en:"Let's Go! ⚡", es:"¡Vamos! ⚡", fr:"C'est parti ! ⚡", pt:"Vamos! ⚡", yo:"Jẹ ki a lọ! ⚡", zh:"出发！⚡", ar:"هيا نذهب! ⚡" },

  // AGENT
  agent_ph:    { en:'Ask about Pokemon…', es:'Pregunta sobre Pokémon…', fr:'Posez une question sur Pokémon…', pt:'Pergunte sobre Pokémon…', yo:'Beere nipa Pokémon…', zh:'询问宝可梦…', ar:'اسأل عن بوكيمون…' },
  agent_greet: { en:"¡Hola! I'm Profesor Justin, your Pokemon teacher! 🎓 What Pokemon question do you have?", es:"¡Hola! ¡Soy el Profesor Justin, tu maestro Pokémon! 🎓 ¿Qué pregunta tienes sobre Pokémon?", fr:"Bonjour ! Je suis le Professeur Justin, ton enseignant Pokémon ! 🎓 Quelle question as-tu sur Pokémon ?", pt:"Olá! Sou o Professor Justin, seu professor Pokémon! 🎓 Que pergunta você tem sobre Pokémon?", yo:"Ẹ káàbọ̀! Mo jẹ Olùkọ́ Justin, olùkọ́ Pokémon rẹ! 🎓 Kini ibeere rẹ nipa Pokémon?", zh:"你好！我是贾斯汀教授，你的宝可梦老师！🎓 你有什么关于宝可梦的问题？", ar:"مرحباً! أنا البروفيسور جاستن، معلم بوكيمون الخاص بك! 🎓 ما هو سؤالك عن بوكيمون؟" },

  // FOOTER
  footer_report: { en:'🚨 Report Something Wrong', es:'🚨 Reportar Algo Incorrecto', fr:'🚨 Signaler Quelque Chose', pt:'🚨 Reportar Algo Errado', yo:'🚨 Ròyìn Ohun Ti Kò Tọ', zh:'🚨 举报问题', ar:'🚨 الإبلاغ عن مشكلة' },
  footer_safe:   { en:"This site is monitored by Jose's family. Stay safe! 💛", es:"Este sitio es monitoreado por la familia de Jose. ¡Mantente seguro! 💛", fr:"Ce site est surveillé par la famille de Jose. Restez en sécurité ! 💛", pt:"Este site é monitorado pela família de Jose. Fique seguro! 💛", yo:"Ẹbi Jose ń ṣọ oju opo yii. Jẹ ki o wa ni aabo! 💛", zh:"此网站由Jose的家人监控。注意安全！💛", ar:"هذا الموقع تراقبه عائلة José. ابق آمناً! 💛" },
};

let currentLang = localStorage.getItem('poke_lang') || 'es';

function t(key) {
  return (T[key] && (T[key][currentLang] || T[key]['en'])) || key;
}

function applyLang() {
  document.documentElement.setAttribute('lang', currentLang);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const attr = el.getAttribute('data-i18n-attr');
    const val = t(key);
    if (attr) el.setAttribute(attr, val);
    else el.innerHTML = val;
  });
  // Update lang picker UI
  const picker = document.getElementById('lang-picker');
  if (picker) {
    picker.querySelectorAll('.lang-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
  }
  // Update agent input placeholder
  const agentInput = document.getElementById('agent-input');
  if (agentInput) agentInput.placeholder = t('agent_ph');
  // RTL support
  document.body.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
  localStorage.setItem('poke_lang', currentLang);
}

function setLang(lang) {
  currentLang = lang;
  applyLang();
  const picker = document.getElementById('lang-picker');
  if (picker) picker.classList.add('hidden');
}

function toggleLangPicker() {
  const picker = document.getElementById('lang-picker');
  if (picker) picker.classList.toggle('hidden');
}

// Close picker when clicking outside
document.addEventListener('click', e => {
  const picker = document.getElementById('lang-picker');
  const btn    = document.getElementById('lang-btn');
  if (picker && !picker.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
    picker.classList.add('hidden');
  }
});
