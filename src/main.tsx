import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthScreen } from './AuthScreen'
import { supabase } from './supabase'
import './styles.css'

type ProjectStatus = 'active' | 'completed' | 'overdue' | 'archived'
type Project = {
  id: string
  title: string
  description: string
  color: string
  coverMedia?: { type: 'image' | 'video'; url: string; loop: boolean }
  timerMode: 'startNow' | 'scheduledStart'
  startDate: string
  deadline: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  notifiedOneDayLeft: boolean
  notifiedOverdue: boolean
}

type FormState = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'notifiedOneDayLeft' | 'notifiedOverdue' | 'status'>
type UserSettings = { name: string; profileImageUrl?: string; appBackground?: { type: 'image' | 'video' | 'color'; url?: string; color?: string }; language: 'en' | 'ar'; soundEnabled: boolean }
type AppView = 'dashboard' | 'timeline'

type StoredMedia = { type: 'image' | 'video'; url: string; loop: boolean }

async function uploadMedia(userId: string, file: File): Promise<StoredMedia> {
  const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
  const { error } = await supabase.storage.from('project-media').upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('project-media').getPublicUrl(path)
  return { type: file.type.startsWith('video/') ? 'video' : 'image', url: data.publicUrl, loop: file.type.startsWith('video/') }
}

const palette = ['#D9A24B', '#B87561', '#75958C', '#9CA47A', '#C78478', '#8E7762']
const defaultSettings: UserSettings = { name: '', language: 'en', soundEnabled: true, appBackground: { type: 'color', color: '#2E2924' } }
const translations = {
  en: { projects: 'Projects', timeline: 'Timeline', settings: 'Open settings', newProject: 'New project', projectFilter: 'Project filter', allProjects: 'All projects', inMotion: 'In motion', finished: 'Finished', thingsInView: 'things in view', quietPage: 'A quiet page', eyebrow: 'A little room for what matters', intro: 'Projects with a place to land, a date to arrive by, and enough breathing room in between.', todayNote: "today's note", made: 'Made for slow progress.', device: 'Everything stays on this device.', dismiss: 'Dismiss', settingsEyebrow: 'Your little studio', settingsTitle: 'Settings', yourName: 'Your name', namePlaceholder: 'What should we call you?', profileImage: 'Profile image', optional: 'optional', background: 'Studio background', backgroundHint: 'image or looping video', chooseCover: 'Choose a cover for your workspace', fallbackColor: 'Fallback color', language: 'Language', english: 'English', arabic: 'Arabic', sound: 'Sound feedback', settingsNote: 'Your settings and projects stay on this device. Notifications work best while the app or browser is running.', done: 'Done', startNew: 'New beginning', editProject: 'Edit project', title: 'Title', titlePlaceholder: 'What are you making room for?', description: 'Description', descriptionPlaceholder: 'A sentence or two to remember the shape of it.', color: 'Color', start: 'Start', now: 'Now', later: 'Later', startDate: 'Start date', deadline: 'Deadline', cover: 'Cover', coverOptional: 'optional · max 15MB', coverPrompt: 'Drop a photo or short looping video here', removeCover: 'Remove cover', cancel: 'Cancel', saveChanges: 'Save changes', keepDate: 'Keep this date', finishedStatus: 'Finished', overdueStatus: 'Needs a new date', activeStatus: 'In motion', markComplete: 'Mark complete', markIncomplete: 'Mark incomplete', noDescription: 'No description yet.', due: 'due', oneDay: '1 day left', overdueBy: 'Overdue by', overdueToday: 'Overdue today', day: 'day', days: 'days', hours: 'hours', hoursLeft: 'hours left', dueSoon: 'Due very soon', notificationReminder: 'A small reminder before the deadline.', notificationPassed: 'Choose a new date when you are ready.', deadlineToast: 'Deadline passed for', oneDayToast: 'One day left for', removedToast: 'Project tucked away', timelineEyebrow: 'See the shape of your time', timelineTitle: 'Your', openSpace: 'open space.', timelineCopy: 'A soft map of what is moving, and the quiet gaps between.', busy: 'Projects in motion', free: 'Open space', today: 'Today', week: 'week', month: 'month', year: 'year', weekLabel: 'Week', activeProject: 'active project', activeProjects: 'active projects', clickBar: 'Click a bar to adjust its dates', noBlocking: 'No projects are blocking the view.', dayLabels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
  ar: { projects: 'المشاريع', timeline: 'الخط الزمني', settings: 'فتح الإعدادات', newProject: 'مشروع جديد', projectFilter: 'تصفية المشاريع', allProjects: 'كل المشاريع', inMotion: 'قيد التنفيذ', finished: 'مكتملة', thingsInView: 'أشياء ظاهرة', quietPage: 'صفحة هادئة', eyebrow: 'مساحة صغيرة لما يهمك', intro: 'مشاريع لها مكان، وموعد تصل إليه، ومساحة كافية بينهما.', todayNote: 'ملاحظة اليوم', made: 'صُنع للتقدم الهادئ.', device: 'كل شيء يبقى على هذا الجهاز.', dismiss: 'إغلاق', settingsEyebrow: 'استوديوك الصغير', settingsTitle: 'الإعدادات', yourName: 'اسمك', namePlaceholder: 'كيف نناديك؟', profileImage: 'الصورة الشخصية', optional: 'اختياري', background: 'خلفية الاستوديو', backgroundHint: 'صورة أو فيديو متكرر', chooseCover: 'اختر غلافًا لمساحتك', fallbackColor: 'اللون الاحتياطي', language: 'اللغة', english: 'English', arabic: 'العربية', sound: 'أصوات التفاعل', settingsNote: 'تبقى إعداداتك ومشاريعك على هذا الجهاز. تعمل الإشعارات بشكل أفضل أثناء تشغيل التطبيق أو المتصفح.', done: 'تم', startNew: 'بداية جديدة', editProject: 'تعديل المشروع', title: 'العنوان', titlePlaceholder: 'ما الذي تفسح له مجالًا؟', description: 'الوصف', descriptionPlaceholder: 'جملة أو جملتان لتتذكر فكرته.', color: 'اللون', start: 'البداية', now: 'الآن', later: 'لاحقًا', startDate: 'تاريخ البداية', deadline: 'الموعد النهائي', cover: 'الغلاف', coverOptional: 'اختياري · 15MB كحد أقصى', coverPrompt: 'أضف صورة أو فيديو قصيرًا متكررًا', removeCover: 'إزالة الغلاف', cancel: 'إلغاء', saveChanges: 'حفظ التغييرات', keepDate: 'تثبيت الموعد', finishedStatus: 'مكتمل', overdueStatus: 'يحتاج موعدًا جديدًا', activeStatus: 'قيد التنفيذ', markComplete: 'تحديد كمكتمل', markIncomplete: 'تحديد كغير مكتمل', noDescription: 'لا يوجد وصف بعد.', due: 'يستحق في', oneDay: 'متبقي يوم واحد', overdueBy: 'متأخر منذ', overdueToday: 'متأخر اليوم', day: 'يوم', days: 'أيام', hours: 'ساعات', hoursLeft: 'ساعات متبقية', dueSoon: 'يستحق قريبًا جدًا', notificationReminder: 'تذكير صغير قبل الموعد النهائي.', notificationPassed: 'اختر موعدًا جديدًا عندما تكون مستعدًا.', deadlineToast: 'انتهى الموعد النهائي لـ', oneDayToast: 'متبقي يوم واحد لـ', removedToast: 'تم حفظ المشروع بعيدًا', timelineEyebrow: 'شاهد شكل وقتك', timelineTitle: 'مساحتك', openSpace: 'المتاحة.', timelineCopy: 'خريطة هادئة لما يتحرك، والفجوات الهادئة بينه.', busy: 'مشاريع قيد التنفيذ', free: 'مساحة متاحة', today: 'اليوم', week: 'أسبوع', month: 'شهر', year: 'سنة', weekLabel: 'أسبوع', activeProject: 'مشروع نشط', activeProjects: 'مشاريع نشطة', clickBar: 'اضغط على شريط لتعديل مواعيده', noBlocking: 'لا توجد مشاريع تحجب رؤيتك.', dayLabels: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] },
} as const
type TranslationKey = Exclude<keyof typeof translations.en, 'dayLabels'>
function tr(language: UserSettings['language'], key: TranslationKey) { return translations[language][key] }
const starterProjects: Project[] = [
  {
    id: 'starter-studio', title: 'Make space for the good work', description: 'A small, considered corner for sketches, notes, and the things that make a day feel like mine.', color: '#B87561', timerMode: 'startNow', startDate: '2026-08-12T09:00', deadline: '2026-09-02T18:00', status: 'active', createdAt: '2026-08-12T09:00', updatedAt: '2026-08-12T09:00', notifiedOneDayLeft: false, notifiedOverdue: false,
  },
  {
    id: 'starter-letter', title: 'Send the autumn letter', description: 'Put a little thought into it. Find a stamp that feels like the right one.', color: '#75958C', timerMode: 'scheduledStart', startDate: '2026-08-24T09:00', deadline: '2026-09-14T12:00', status: 'active', createdAt: '2026-08-12T09:00', updatedAt: '2026-08-12T09:00', notifiedOneDayLeft: false, notifiedOverdue: false,
  },
]

const blankForm = (): FormState => ({ title: '', description: '', color: palette[0], timerMode: 'startNow', startDate: localDateTime(), deadline: localDateTime(7), coverMedia: undefined })

function localDateTime(daysFromNow = 0) {
  const date = new Date(Date.now() + daysFromNow * 86400000)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function formatRemaining(deadline: string, language: UserSettings['language'] = 'en') {
  const diff = new Date(deadline).getTime() - Date.now()
  const absHours = Math.floor(Math.abs(diff) / 3600000)
  const days = Math.floor(absHours / 24)
  if (diff < 0) return days ? `${tr(language, 'overdueBy')} ${days} ${days === 1 ? tr(language, 'day') : tr(language, 'days')}` : tr(language, 'overdueToday')
  if (days > 0) return `${days} ${days === 1 ? tr(language, 'day') : tr(language, 'days')} ${language === 'ar' ? 'متبقية' : 'left'}`
  if (absHours > 0) return `${absHours} ${tr(language, 'hoursLeft')}`
  return tr(language, 'dueSoon')
}

function formatDate(value: string, language: UserSettings['language'] = 'en') {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function progress(project: Project) {
  const start = new Date(project.startDate).getTime()
  const end = new Date(project.deadline).getTime()
  return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100))
}

function playTone(kind: 'save' | 'complete' | 'delete' | 'alert', muted: boolean) {
  if (muted) return
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return
  const context = new AudioContextClass()
  const notes = kind === 'complete' ? [392, 523] : kind === 'alert' ? [440, 349] : [kind === 'delete' ? 180 : 290]
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = frequency
    oscillator.type = 'sine'
    gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.09)
    gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + index * 0.09 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.09 + 0.38)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(context.currentTime + index * 0.09)
    oscillator.stop(context.currentTime + index * 0.09 + 0.4)
  })
}

function DashboardApp({ onLogout, userId }: { onLogout: () => void; userId: string }) {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('deadline-keeper-projects')
    return saved ? JSON.parse(saved) : starterProjects
  })
  const [editing, setEditing] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [muted, setMuted] = useState(() => localStorage.getItem('deadline-keeper-muted') === 'true')
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [updateReady, setUpdateReady] = useState(false)
  const [clock, setClock] = useState(Date.now())
  const [view, setView] = useState<AppView>('dashboard')
  const [layoutMode, setLayoutMode] = useState<'list' | 'cards'>('list')
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<UserSettings>(() => { const saved = localStorage.getItem('deadline-keeper-settings'); return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings })

  useEffect(() => { localStorage.setItem('deadline-keeper-projects', JSON.stringify(projects)) }, [projects])
  useEffect(() => { localStorage.setItem('deadline-keeper-muted', String(muted)) }, [muted])
  useEffect(() => { localStorage.setItem('deadline-keeper-settings', JSON.stringify(settings)); setMuted(!settings.soundEnabled) }, [settings])
  useEffect(() => {
    const handleUpdate = () => { setUpdateReady(true); setNotice('A new version is available.') }
    window.addEventListener('deadline-keeper-update', handleUpdate)
    return () => window.removeEventListener('deadline-keeper-update', handleUpdate)
  }, [])
  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 60000)
    const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => { clearInterval(interval); window.removeEventListener('beforeinstallprompt', handler) }
  }, [])
  useEffect(() => {
    projects.forEach(project => {
      const timeToDeadline = new Date(project.deadline).getTime() - Date.now()
      if (project.status !== 'completed' && timeToDeadline > 0 && timeToDeadline <= 86400000 && !project.notifiedOneDayLeft) {
        if ('Notification' in window && Notification.permission === 'granted') new Notification(`${tr(settings.language, 'oneDay')}: ${project.title}`, { body: tr(settings.language, 'notificationReminder') })
        setNotice(`${tr(settings.language, 'oneDayToast')} “${project.title}”`)
        playTone('alert', muted)
        updateProject(project.id, { notifiedOneDayLeft: true })
      }
      if (project.status !== 'completed' && timeToDeadline < 0 && !project.notifiedOverdue) {
        if ('Notification' in window && Notification.permission === 'granted') new Notification(`${tr(settings.language, 'deadlineToast')}: ${project.title}`, { body: tr(settings.language, 'notificationPassed') })
        setNotice(`${tr(settings.language, 'deadlineToast')} “${project.title}”`)
        playTone('alert', muted)
        updateProject(project.id, { status: 'overdue', notifiedOverdue: true })
      }
    })
  }, [clock])

  const visibleProjects = useMemo(() => projects.filter(project => filter === 'all' || project.status === filter).sort((a, b) => {
    const urgency = (project: Project) => project.status === 'overdue' ? -1 : project.status === 'completed' ? 1 : 0
    return urgency(a) - urgency(b) || new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  }), [projects, filter])
  const activeCount = projects.filter(project => project.status === 'active' || project.status === 'overdue').length
  const completedCount = projects.filter(project => project.status === 'completed').length
  const nextDeadline = projects.filter(project => project.status !== 'completed').sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0]
  const daysUntilNext = nextDeadline ? Math.max(0, Math.ceil((new Date(nextDeadline.deadline).getTime() - Date.now()) / 86400000)) : 0

  function updateProject(id: string, patch: Partial<Project>) {
    setProjects(current => current.map(project => project.id === id ? { ...project, ...patch, updatedAt: new Date().toISOString() } : project))
  }

  function openCreate() { setEditing(null); setIsCreating(true) }
  function openEdit(project: Project) { setIsCreating(false); setEditing(project) }
  async function saveProject(form: FormState) {
    const now = new Date().toISOString()
    const current = editing
    if (form.coverMedia?.url.startsWith('blob:')) { setNotice('Please re-upload this media before saving.'); return }
    const project: Project = current ? { ...current, ...form, status: new Date(form.deadline) < new Date() ? 'overdue' : current.status === 'completed' ? 'completed' : 'active', updatedAt: now } : { ...form, id: crypto.randomUUID(), status: 'active', createdAt: now, updatedAt: now, notifiedOneDayLeft: false, notifiedOverdue: false }
    const { error } = current
      ? await supabase.from('projects').update({ title: project.title, description: project.description, color: project.color, cover_media: project.coverMedia, timer_mode: project.timerMode, start_date: project.startDate, deadline: project.deadline, status: project.status, updated_at: project.updatedAt }).eq('id', project.id).eq('user_id', userId)
      : await supabase.from('projects').insert({ id: project.id, user_id: userId, title: project.title, description: project.description, color: project.color, cover_media: project.coverMedia, timer_mode: project.timerMode, start_date: project.startDate, deadline: project.deadline, status: project.status, created_at: project.createdAt, updated_at: project.updatedAt, notified_one_day_left: project.notifiedOneDayLeft, notified_overdue: project.notifiedOverdue })
    if (error) { setNotice(`Could not save project: ${error.message}`); return }
    setProjects(existing => current ? existing.map(item => item.id === project.id ? project : item) : [project, ...existing])
    playTone('save', muted)
    setEditing(null); setIsCreating(false)
  }
  function removeProject(id: string) { setProjects(current => current.filter(project => project.id !== id)); playTone('delete', muted); setNotice(tr(settings.language, 'removedToast')) }
  function toggleComplete(project: Project) { updateProject(project.id, { status: project.status === 'completed' ? 'active' : 'completed' }); playTone(project.status === 'completed' ? 'save' : 'complete', muted) }
  async function install() { if (!installPrompt) return; await installPrompt.prompt(); setInstallPrompt(null) }
  async function requestNotifications() { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission() }

  const background = settings.appBackground
  const language = settings.language
  return <div className="app-shell font-body" dir={settings.language === 'ar' ? 'rtl' : 'ltr'} style={{ backgroundColor: background?.color || '#2E2924' }}>
    {background?.url && (background.type === 'video' ? <video className="app-background" src={background.url} autoPlay muted loop playsInline /> : <img className="app-background" src={background.url} alt="" />)}
    <div className="background-particles" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>
    <header className="topbar content-width">
      <a className="brand" href="/" aria-label="Deadline Keeper home">{settings.profileImageUrl ? <img className="profile-avatar" src={settings.profileImageUrl} alt="" /> : <span className="brand-mark">dk</span>}<span>Deadline Keeper</span></a>
      <div className="top-actions">
        <nav className="main-nav" aria-label={tr(language, 'projects')}><button className={view === 'dashboard' ? 'nav-active font-heading' : 'font-heading'} onClick={() => setView('dashboard')}>{tr(language, 'projects')}</button><button className={view === 'timeline' ? 'nav-active font-heading' : 'font-heading'} onClick={() => setView('timeline')}>{tr(language, 'timeline')}</button></nav>
        <button className="icon-button" onClick={() => setSettingsOpen(true)} title={tr(language, 'settings')} aria-label={tr(language, 'settings')}>⚙</button>
        <button className="icon-button logout-button" onClick={onLogout} title="Log out" aria-label="Log out">↪</button>
        {installPrompt && <button className="quiet-button install-button" onClick={install}>⇩ <span>{language === 'ar' ? 'تثبيت التطبيق' : 'Install app'}</span></button>}
        {view === 'dashboard' && <button className="add-button" onClick={openCreate}><span>＋</span> {tr(language, 'newProject')}</button>}
      </div>
    </header>

    <main className="content-width main-content">
      {view === 'dashboard' ? <><section className="intro">
        <div>
          <p className="eyebrow">{tr(language, 'eyebrow')}</p>
          <h1 className="font-heading">{settings.name ? <>{language === 'ar' ? `مرحبًا، ${settings.name}` : `Hey, ${settings.name}`}<br /><em>{language === 'ar' ? 'لنفسح مجالًا.' : "let's make room."}</em></> : <>{language === 'ar' ? <>احفظ وعودك<br /><em>لنفسك.</em></> : <>Keep your promises<br /><em>to yourself.</em></>}</>}</h1>
          <p className="intro-copy">{tr(language, 'intro')}</p>
        </div>
        <div className="desk-note" aria-hidden="true"><span>{tr(language, 'todayNote')}</span><strong>{new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', { weekday: 'long' }).format(new Date())}</strong><small>{new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', { month: 'long', day: 'numeric' }).format(new Date())}</small></div>
      </section>

      <section className="deadline-pulse"><div className="pulse-badge">✦</div><div><span className="eyebrow">{language === 'ar' ? 'الخطوة التالية' : 'Next up'}</span><strong>{nextDeadline ? `${daysUntilNext} ${daysUntilNext === 1 ? 'day' : 'days'} until ${nextDeadline.title}` : 'A clear page ahead'}</strong></div><span className="xp-badge">{activeCount} in motion</span></section>

      <div className="toolbar">
        <div className="filter-tabs" role="tablist" aria-label={tr(language, 'projectFilter')}>
          {([[ 'all', `${tr(language, 'allProjects')} · ${projects.length}`], ['active', `${tr(language, 'inMotion')} · ${activeCount}`], ['completed', `${tr(language, 'finished')} · ${completedCount}`]] as const).map(([key, label]) => <button key={key} className={filter === key ? 'active font-heading' : 'font-heading'} onClick={() => setFilter(key)}>{label}</button>)}
        </div>
        <div className="view-switch" role="group" aria-label="Project layout"><button className={layoutMode === 'list' ? 'selected' : ''} onClick={() => setLayoutMode('list')} title="List view">☷</button><button className={layoutMode === 'cards' ? 'selected' : ''} onClick={() => setLayoutMode('cards')} title="Card view">▦</button></div>
      </div>

      {visibleProjects.length ? <motion.div layout className={layoutMode === 'list' ? 'project-list' : 'project-grid'}>{visibleProjects.map(project => layoutMode === 'list' ? <ProjectListRow key={project.id} project={project} language={language} onEdit={openEdit} onComplete={toggleComplete} onDelete={() => setDeleteTarget(project)} /> : <ProjectCard key={project.id} project={project} language={language} onEdit={openEdit} onComplete={toggleComplete} onDelete={() => setDeleteTarget(project)} />)}</motion.div> : <EmptyState language={language} onCreate={openCreate} />}</> : <TimelineView projects={projects} language={language} onEdit={openEdit} />}
    </main>

    <footer className="footer content-width"><span>{tr(language, 'made')}</span><span>{tr(language, 'device')}</span></footer>
    <AnimatePresence>{(isCreating || editing) && <ProjectModal initial={editing} language={language} userId={userId} onClose={() => { setEditing(null); setIsCreating(false) }} onSave={saveProject} onRequestNotifications={requestNotifications} />}</AnimatePresence>
    <AnimatePresence>{settingsOpen && <SettingsPanel settings={settings} language={language} userId={userId} onChange={setSettings} onClose={() => setSettingsOpen(false)} />}</AnimatePresence>
    <AnimatePresence>{deleteTarget && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="delete-confirmation" initial={{ scale: .94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><p className="eyebrow">{language === 'ar' ? 'إزالة المشروع' : 'Remove project'}</p><h2 className="font-heading">{language === 'ar' ? 'هل نطوي هذه الصفحة؟' : 'Fold this page away?'}</h2><p>{language === 'ar' ? `سيتم حذف ${deleteTarget.title}.` : `${deleteTarget.title} will be removed from your desk.`}</p><div className="modal-actions"><button className="quiet-button" onClick={() => setDeleteTarget(null)}>{tr(language, 'cancel')}</button><button className="reset-confirm-button" onClick={() => { removeProject(deleteTarget.id); setDeleteTarget(null) }}>{language === 'ar' ? 'حذف' : 'Delete'}</button></div></motion.div></motion.div>}</AnimatePresence>
    <AnimatePresence>{notice && <motion.div className="toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ type: 'spring', bounce: 0.35 }} onAnimationComplete={() => !updateReady && setTimeout(() => setNotice(null), 3800)}>{notice}{updateReady && <button className="toast-update" onClick={() => { navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' }); window.location.reload() }}>Reload</button>}<button onClick={() => { setNotice(null); setUpdateReady(false) }} aria-label={tr(language, 'dismiss')}>×</button></motion.div>}</AnimatePresence>
  </div>
}

function assignTimelineLanes(projects: Project[]) {
  const laneEnds: number[] = []
  return projects.map(project => {
    const start = new Date(project.startDate).getTime()
    const end = new Date(project.deadline).getTime()
    const lane = laneEnds.findIndex(laneEnd => laneEnd <= start)
    const row = lane === -1 ? laneEnds.length : lane
    laneEnds[row] = end
    return { project, row }
  })
}

function TimelineView({ projects, language, onEdit }: { projects: Project[]; language: UserSettings['language']; onEdit: (project: Project) => void }) {
  const [range, setRange] = useState<'week' | 'month' | 'year'>('month')
  const now = new Date()
  const rangeStart = new Date(now)
  if (range === 'week') rangeStart.setDate(now.getDate() - now.getDay())
  if (range === 'month') rangeStart.setDate(1)
  if (range === 'year') rangeStart.setMonth(0, 1)
  const rangeEnd = new Date(rangeStart)
  if (range === 'week') rangeEnd.setDate(rangeStart.getDate() + 7)
  if (range === 'month') rangeEnd.setMonth(rangeStart.getMonth() + 1)
  if (range === 'year') rangeEnd.setFullYear(rangeStart.getFullYear() + 1)
  const span = rangeEnd.getTime() - rangeStart.getTime()
  const active = projects.filter(project => project.status !== 'archived').sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  const lanes = assignTimelineLanes(active)
  const position = (value: string) => Math.min(100, Math.max(0, ((new Date(value).getTime() - rangeStart.getTime()) / span) * 100))
  return <section className="timeline-view"><div className="timeline-heading"><div><p className="eyebrow">{tr(language, 'timelineEyebrow')}</p><h1 className="font-heading">{tr(language, 'timelineTitle')} <em>{tr(language, 'openSpace')}</em></h1><p className="intro-copy">{tr(language, 'timelineCopy')}</p></div><div className="range-switcher">{(['week', 'month', 'year'] as const).map(item => <button key={item} className={range === item ? 'selected font-heading' : 'font-heading'} onClick={() => setRange(item)}>{tr(language, item)}</button>)}</div></div><div className="timeline-legend"><span><i className="legend-dot busy" />{tr(language, 'busy')}</span><span><i className="legend-dot free" />{tr(language, 'free')}</span><span className="today-key">{tr(language, 'today')} · {formatDate(now.toISOString(), language)}</span></div><div className={`timeline-board ${range}`} style={{ minHeight: `${Math.max(390, 160 + lanes.length * 52)}px` }}><div className="timeline-scale">{Array.from({ length: range === 'week' ? 7 : range === 'month' ? 5 : 12 }, (_, index) => <span key={index}>{range === 'week' ? translations[language].dayLabels[index] : range === 'month' ? `${tr(language, 'weekLabel')} ${index + 1}` : new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', { month: 'short' }).format(new Date(rangeStart.getFullYear(), index, 1))}</span>)}</div><div className="today-line" style={{ left: `${position(now.toISOString())}%` }} /><div className="timeline-freeband" />{active.length ? lanes.map(({ project, row }) => <button className="timeline-bar font-heading" key={project.id} onClick={() => onEdit(project)} style={{ '--row': row, left: `${position(project.startDate)}%`, width: `${Math.max(3, position(project.deadline) - position(project.startDate))}%`, background: project.color } as React.CSSProperties}><strong>{project.title}</strong><small>{formatRemaining(project.deadline, language)}</small></button>) : <p className="timeline-empty">{tr(language, 'noBlocking')}</p>}</div><div className="timeline-summary"><strong>{active.length} {active.length === 1 ? tr(language, 'activeProject') : tr(language, 'activeProjects')}</strong><span>{tr(language, 'clickBar')}</span></div></section>
}

function SettingsPanel({ settings, language, userId, onChange, onClose }: { settings: UserSettings; language: UserSettings['language']; userId: string; onChange: (settings: UserSettings) => void; onClose: () => void }) {
  const [resetRequested, setResetRequested] = useState(false)
  const [mediaError, setMediaError] = useState('')
  const [uploading, setUploading] = useState(false)
  function patch(patch: Record<string, unknown>) { onChange({ ...settings, ...patch } as UserSettings) }
  async function handleMedia(file?: File) { if (!file) return; if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return setMediaError('Choose an image or video.'); if (file.size > 15 * 1024 * 1024) return setMediaError('Keep media under 15MB.'); setMediaError(''); setUploading(true); try { const media = await uploadMedia(userId, file); const nextSettings = { ...settings, appBackground: { type: media.type, url: media.url, color: settings.appBackground?.color || '#2E2924' } } as UserSettings; const { error } = await supabase.from('user_settings').update({ app_background: nextSettings.appBackground }).eq('user_id', userId); if (error) throw error; onChange(nextSettings) } catch (error) { setMediaError(error instanceof Error ? error.message : 'Media upload failed.'); } finally { setUploading(false) } }
  function resetSettings() { onChange({ ...defaultSettings, appBackground: { type: 'color', color: defaultSettings.appBackground?.color || '#2E2924' } }); setResetRequested(false) }
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', bounce: 0.35 }} onMouseDown={event => event.target === event.currentTarget && onClose()}><motion.aside className="modal-panel settings-panel" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: 'spring', bounce: 0.35 }}><div className="modal-header"><div><p className="eyebrow">{tr(language, 'settingsEyebrow')}</p><h2 className="font-heading">{tr(language, 'settingsTitle')}</h2></div><button className="close-button" onClick={onClose} aria-label={tr(language, 'dismiss')}>×</button></div><label>{tr(language, 'yourName')}<input value={settings.name} maxLength={40} onChange={event => patch({ name: event.target.value })} placeholder={tr(language, 'namePlaceholder')} /></label><label>{tr(language, 'profileImage')}<span className="field-hint">{tr(language, 'optional')}</span><div className="profile-upload">{settings.profileImageUrl ? <img src={settings.profileImageUrl} alt={tr(language, 'profileImage')} /> : <span>＋</span>}<input type="file" accept="image/*" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 15 * 1024 * 1024) return setMediaError('Keep media under 15MB.'); setMediaError(''); setUploading(true); try { const media = await uploadMedia(userId, file); const { error } = await supabase.from('user_settings').update({ profile_image_url: media.url }).eq('user_id', userId); if (error) throw error; onChange({ ...settings, profileImageUrl: media.url }) } catch (error) { setMediaError(error instanceof Error ? error.message : 'Media upload failed.') } finally { setUploading(false) } }} /></div></label><label>{tr(language, 'background')}<span className="field-hint">{tr(language, 'backgroundHint')}</span><div className="upload-box settings-upload" style={{ '--accent': settings.appBackground?.color || '#D9A24B' } as React.CSSProperties}>{settings.appBackground?.url ? (settings.appBackground.type === 'video' ? <video src={settings.appBackground.url} autoPlay muted loop playsInline /> : <img src={settings.appBackground.url} alt={tr(language, 'background')} />) : <><span className="upload-icon">⌁</span><span>{tr(language, 'chooseCover')}</span></>}<input type="file" accept="image/*,video/*" onChange={event => handleMedia(event.target.files?.[0])} /></div>{uploading && <span className="error-text">Uploading...</span>}{mediaError && <span className="error-text">{mediaError}</span>}</label><label>{tr(language, 'fallbackColor')}<div className="settings-color"><input type="color" value={settings.appBackground?.color || '#2E2924'} onChange={event => patch({ appBackground: { ...settings.appBackground, type: settings.appBackground?.url ? settings.appBackground.type : 'color', color: event.target.value } })} /><span>{settings.appBackground?.color || '#2E2924'}</span></div></label><label>{tr(language, 'language')}<div className="segmented"><button type="button" className={settings.language === 'en' ? 'selected' : ''} onClick={() => patch({ language: 'en' })}>{tr(language, 'english')}</button><button type="button" className={settings.language === 'ar' ? 'selected' : ''} onClick={() => patch({ language: 'ar' })}>{tr(language, 'arabic')}</button></div></label><label className="setting-toggle"><span>{tr(language, 'sound')}</span><button type="button" className={settings.soundEnabled ? 'toggle on' : 'toggle'} onClick={() => patch({ soundEnabled: !settings.soundEnabled })} aria-label={tr(language, 'sound')}><i /></button></label><p className="settings-note">{tr(language, 'settingsNote')}</p><div className="reset-area"><button type="button" className="reset-button" onClick={() => setResetRequested(true)}>Reset to Default Settings</button>{resetRequested && <motion.div className="reset-confirmation" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}><p>Reset your settings? Your projects will stay untouched.</p><div><button type="button" className="quiet-button" onClick={() => setResetRequested(false)}>Cancel</button><button type="button" className="reset-confirm-button" onClick={resetSettings}>Reset settings</button></div></motion.div>}</div><div className="modal-actions"><button className="add-button" onClick={onClose}>{tr(language, 'done')} <span>↗</span></button></div></motion.aside></motion.div>
}

function ProjectListRow({ project, language, onEdit, onComplete, onDelete }: { project: Project; language: UserSettings['language']; onEdit: (project: Project) => void; onComplete: (project: Project) => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const statusLabel = project.status === 'completed' ? tr(language, 'finishedStatus') : project.status === 'overdue' ? tr(language, 'overdueStatus') : tr(language, 'activeStatus')
  return <motion.article layout className={`project-row ${project.status === 'completed' ? 'is-complete' : ''} ${project.status === 'overdue' ? 'is-overdue' : ''}`} style={{ '--accent': project.color } as React.CSSProperties}>
    <button className="check-button row-check" onClick={() => onComplete(project)} aria-label={project.status === 'completed' ? tr(language, 'markIncomplete') : tr(language, 'markComplete')}>{project.status === 'completed' ? '✓' : '○'}</button>
    <div className="row-thumb">{project.coverMedia?.type === 'video' ? <video src={project.coverMedia.url} autoPlay muted loop playsInline /> : project.coverMedia?.url ? <img src={project.coverMedia.url} alt="" /> : <span>✦</span>}</div>
    <button className="row-main" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}><span className="project-status">{statusLabel}</span><strong className="font-heading">{project.title}</strong>{expanded && <span className="row-description">{project.description || tr(language, 'noDescription')}</span>}</button>
    <div className="row-due"><strong className={project.status === 'overdue' ? 'overdue-text' : ''}>{formatRemaining(project.deadline, language)}</strong><small>{formatDate(project.deadline, language)}</small></div>
    <button className="row-edit" onClick={() => onEdit(project)} aria-label="Edit project" title="Edit project">↗</button><button className="row-delete" onClick={onDelete} aria-label="Delete project" title="Delete project">⌫</button>
  </motion.article>
}

function ProjectCard({ project, language, onEdit, onComplete, onDelete }: { project: Project; language: UserSettings['language']; onEdit: (project: Project) => void; onComplete: (project: Project) => void; onDelete: () => void }) {
  return <motion.article layout whileHover={{ scale: 1.04, rotate: 1.3, y: -4 }} transition={{ type: 'spring', bounce: 0.35 }} className={`project-card ${project.status === 'completed' ? 'is-complete' : ''}`} style={{ '--accent': project.color } as React.CSSProperties} onClick={() => onEdit(project)}>
    {project.coverMedia?.type === 'video' ? <video className="card-media" src={project.coverMedia.url} autoPlay muted loop playsInline /> : project.coverMedia?.url && <img className="card-media" src={project.coverMedia.url} alt="" />}
    <div className="card-wash" />
    <div className="card-content"><div className="card-topline"><span className="project-status">{project.status === 'completed' ? tr(language, 'finishedStatus') : project.status === 'overdue' ? tr(language, 'overdueStatus') : tr(language, 'activeStatus')}</span><div className="card-actions"><button className="check-button" onClick={event => { event.stopPropagation(); onComplete(project) }} aria-label={project.status === 'completed' ? tr(language, 'markIncomplete') : tr(language, 'markComplete')}>{project.status === 'completed' ? '✓' : '○'}</button><button className="delete-icon" onClick={event => { event.stopPropagation(); onDelete() }} aria-label="Delete project" title="Delete project">⌫</button></div></div><h2 className="font-heading">{project.title}</h2><p>{project.description || tr(language, 'noDescription')}</p><div className="card-bottom"><div><strong className={project.status === 'overdue' ? 'overdue-text' : ''}>{formatRemaining(project.deadline, language)}</strong><small>{tr(language, 'due')} {formatDate(project.deadline, language)}</small></div><span className="arrow">↗</span></div><div className="progress-track"><span style={{ width: `${progress(project)}%` }} /></div></div>
  </motion.article>
}

function EmptyState({ language, onCreate }: { language: UserSettings['language']; onCreate: () => void }) { return <section className="empty-state"><div className="empty-sketch">✦</div><p className="eyebrow">{language === 'ar' ? 'الصفحة لك' : 'The page is yours'}</p><h2 className="font-heading">{language === 'ar' ? <>لا شيء يطلب<br /><em>اهتمامك بعد.</em></> : <>Nothing is asking<br /><em>for you yet.</em></>}</h2><p>{language === 'ar' ? 'ابدأ بشيء صغير تود أن تفسح له مجالًا.' : 'Start with one small thing you would like to make space for.'}</p><button className="add-button" onClick={onCreate}>＋ {language === 'ar' ? 'أضف مشروعك الأول' : 'Add your first project'}</button></section> }

function ProjectModal({ initial, language, userId, onClose, onSave, onRequestNotifications }: { initial: Project | null; language: UserSettings['language']; userId: string; onClose: () => void; onSave: (form: FormState) => Promise<void>; onRequestNotifications: () => void }) {
  const [form, setForm] = useState<FormState>(initial ? { title: initial.title, description: initial.description, color: initial.color, coverMedia: initial.coverMedia, timerMode: initial.timerMode, startDate: initial.startDate, deadline: initial.deadline } : blankForm())
  const [mediaError, setMediaError] = useState('')
  const [uploading, setUploading] = useState(false)
  const remaining = formatRemaining(form.deadline, language)
  function setField<K extends keyof FormState>(field: K, value: FormState[K]) { setForm(current => ({ ...current, [field]: value })) }
  async function handleFile(file?: File) { if (!file) return; if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return setMediaError(language === 'ar' ? 'اختر صورة أو فيديو قصيرًا.' : 'Choose an image or short video.'); if (file.size > 15 * 1024 * 1024) return setMediaError(language === 'ar' ? 'حافظ على حجم الوسائط أقل من 15MB.' : 'Keep media under 15MB.'); setMediaError(''); setUploading(true); try { setField('coverMedia', await uploadMedia(userId, file)) } catch (error) { setMediaError(error instanceof Error ? error.message : 'Media upload failed.') } finally { setUploading(false) } }
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', bounce: 0.35 }} onMouseDown={event => event.target === event.currentTarget && onClose()}><motion.aside className="modal-panel" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: 'spring', bounce: 0.35 }}><div className="modal-header"><div><p className="eyebrow">{initial ? (language === 'ar' ? 'تنقيح التفاصيل' : 'Refine the details') : tr(language, 'startNew')}</p><h2 className="font-heading">{initial ? tr(language, 'editProject') : (language === 'ar' ? 'أفسح له مجالًا' : 'Make room for it')}</h2></div><button className="close-button" onClick={onClose} aria-label={tr(language, 'dismiss')}>×</button></div><form onSubmit={event => { event.preventDefault(); if (!form.title.trim()) return; onRequestNotifications(); onSave(form) }}><label>{tr(language, 'title')}<input autoFocus required value={form.title} maxLength={70} onChange={event => setField('title', event.target.value)} placeholder={tr(language, 'titlePlaceholder')} /></label><label>{tr(language, 'description')} <span className="field-hint">{form.description.length}/140</span><textarea value={form.description} maxLength={140} onChange={event => setField('description', event.target.value)} placeholder={tr(language, 'descriptionPlaceholder')} /></label><div className="field-row"><label>{tr(language, 'color')}<div className="swatches">{palette.map(color => <button type="button" key={color} className={form.color === color ? 'swatch selected' : 'swatch'} style={{ background: color }} onClick={() => setField('color', color)} aria-label={`${tr(language, 'color')} ${color}`} />)}<input className="color-input" type="color" value={form.color} onChange={event => setField('color', event.target.value)} aria-label={tr(language, 'color')} /></div></label><label>{tr(language, 'start')}<div className="segmented"><button type="button" className={form.timerMode === 'startNow' ? 'selected' : ''} onClick={() => { setField('timerMode', 'startNow'); setField('startDate', localDateTime()) }}>{tr(language, 'now')}</button><button type="button" className={form.timerMode === 'scheduledStart' ? 'selected' : ''} onClick={() => setField('timerMode', 'scheduledStart')}>{tr(language, 'later')}</button></div></label></div>{form.timerMode === 'scheduledStart' && <label>{tr(language, 'startDate')}<input type="datetime-local" value={form.startDate} onChange={event => setField('startDate', event.target.value)} /></label>}<label>{tr(language, 'deadline')} <span className="field-hint countdown-hint">{remaining}</span><input required type="datetime-local" value={form.deadline} onChange={event => setField('deadline', event.target.value)} /></label><label>{tr(language, 'cover')} <span className="field-hint">{tr(language, 'coverOptional')}</span><div className="upload-box" style={{ '--accent': form.color } as React.CSSProperties}>{form.coverMedia?.type === 'video' ? <video src={form.coverMedia.url} autoPlay muted loop playsInline /> : form.coverMedia?.url ? <img src={form.coverMedia.url} alt={tr(language, 'cover')} /> : <><span className="upload-icon">⌁</span><span>{tr(language, 'coverPrompt')}</span></>}<input type="file" accept="image/*,video/*" onChange={event => handleFile(event.target.files?.[0])} />{form.coverMedia?.url && <button type="button" className="remove-media" onClick={() => setField('coverMedia', undefined)}>{tr(language, 'removeCover')}</button>}</div>{mediaError && <span className="error-text">{mediaError}</span>}</label><div className="modal-actions"><button type="button" className="quiet-button" onClick={onClose}>{tr(language, 'cancel')}</button><button className="add-button" type="submit" disabled={uploading}>{uploading ? 'Uploading...' : initial ? tr(language, 'saveChanges') : tr(language, 'keepDate')} <span>↗</span></button></div></form></motion.aside></motion.div>
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> }

export default App

async function ensureUserSettings(userId: string) {
  const { data } = await supabase.from('user_settings').select('user_id').eq('user_id', userId).maybeSingle()
  if (!data) await supabase.from('user_settings').insert({ user_id: userId, name: defaultSettings.name, profile_image_url: null, app_background: defaultSettings.appBackground, language: defaultSettings.language, sound_enabled: defaultSettings.soundEnabled })
}

function App() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session)
        setCheckingSession(false)
        if (data.session?.user) void ensureUserSettings(data.session.user.id)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setCheckingSession(false)
      if (nextSession?.user) void ensureUserSettings(nextSession.user.id)
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  if (checkingSession) return <main className="auth-loading"><p className="eyebrow">Deadline Keeper</p><p>Making a little room...</p></main>
  if (!session) return <AuthScreen />
  return <DashboardApp userId={session.user.id} onLogout={() => { void supabase.auth.signOut() }} />
}

const rootElement = document.getElementById('root')!
const appWindow = window as typeof window & { __deadlineKeeperMounted?: boolean }
if (!appWindow.__deadlineKeeperMounted) {
  appWindow.__deadlineKeeperMounted = true
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registration = await navigator.serviceWorker.register('/sw.js')
    const announceUpdate = () => window.dispatchEvent(new Event('deadline-keeper-update'))
    if (registration.waiting) announceUpdate()
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing
      if (!installing) return
      installing.addEventListener('statechange', () => { if (installing.state === 'installed' && navigator.serviceWorker.controller) announceUpdate() })
    })
    window.addEventListener('focus', () => { void registration.update() })
  })
}
