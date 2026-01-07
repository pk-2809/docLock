import { Injectable } from '@angular/core';

export interface IconMapping {
  keywords: string[];
  icon: string;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class IconMappingService {

  private folderMappings: IconMapping[] = [
    {
      keywords: [
        'id', 'ids', 'identity', 'identification', 'passport', 'license', 'licence', 'driving', 'voter',
        'aadhaar', 'aadhar', 'pan', 'ration', 'ration card', 'government id', 'govt', 'uid',
        'ssn', 'social security', 'voter id', 'epic', 'driving licence', 'dl', 'pan card', 'aadhaar card',
        'family id', 'samagra', 'abha', 'health id', 'birth certificate', 'caste certificate', 'income certificate',
        'domicile', 'residence proof', 'national id', 'digilocker', 'digital india', 'e-kyc'
      ],
      icon: 'identification',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'education', 'school', 'college', 'university', 'marksheet', 'mark sheet', 'certificate',
        'degree', 'diploma', 'academic', 'transcript', 'result', 'admit card', 'hall ticket',
        'exam', 'course', 'training', 'internship', 'syllabus', 'cbse', 'icse', 'state board', 'ssc', 'hsc', '10th', '12th',
        'jee', 'neet', 'cat', 'gate', 'upsc', 'ssc exam', 'bank exam', 'ugc', 'net', 'ctet', 'tet',
        'btech', 'be', 'bcom', 'bsc', 'mtech', 'mba', 'msc', 'phd', 'distance education'
      ],
      icon: 'academic-cap',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'medical', 'health', 'hospital', 'doctor', 'prescription', 'report', 'test', 'lab',
        'medicine', 'healthcare', 'clinic', 'diagnosis', 'xray', 'mri', 'scan', 'vaccination',
        'insurance claim', 'fitness', 'diet', 'ayush', 'ayurveda', 'homeopathy', 'allopathy',
        'covid', 'covid certificate', 'cowin', 'abha', 'health id', 'pmjay', 'ayushman', 'jan arogya',
        'blood report', 'ecg', 'ultrasound', 'discharge summary', 'medical bills', 'medical reimbursement'
      ],
      icon: 'heart',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'bank', 'banking', 'finance', 'financial', 'statement', 'loan', 'credit', 'debit',
        'account', 'money', 'payment', 'emi', 'interest', 'deposit', 'withdrawal',
        'passbook', 'ifsc', 'cheque', 'upi', 'savings account', 'current account', 'fd', 'fixed deposit', 'rd', 'recurring deposit',
        'net banking', 'mobile banking', 'upi id', 'upi transaction', 'imps', 'neft', 'rtgs', 'kcc', 'pmjd', 'jan dhan',
        'sbi', 'icici', 'hdfc', 'axis', 'pnb', 'bank of india'
      ],
      icon: 'building-library',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'insurance', 'policy', 'claim', 'coverage', 'premium', 'life insurance',
        'health insurance', 'car insurance', 'bike insurance', 'vehicle insurance',
        'term plan', 'mediclaim', 'nominee', 'lic', 'lic policy', 'lic premium', 'pmjjby', 'pmsby',
        'jan suraksha', 'ayushman bharat', 'general insurance', 'third party insurance',
        'policy number', 'renewal', 'endorsement', 'claim form'
      ],
      icon: 'shield-check',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'legal', 'law', 'court', 'agreement', 'contract', 'will', 'property', 'deed',
        'lawyer', 'advocate', 'attorney', 'case', 'petition', 'notice', 'summon',
        'affidavit', 'notary', 'stamp paper', 'e-stamp', 'stamp duty',
        'sale deed', 'lease deed', 'rent agreement', 'power of attorney',
        'poa', 'mou', 'memorandum', 'legal notice', 'high court', 'district court', 'supreme court',
        'fir', 'police complaint', 'bail', 'judgment', 'order',
        'succession certificate', 'legal heir', 'probate'
      ],
      icon: 'scale',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'work', 'job', 'office', 'professional', 'career', 'employment', 'company',
        'business', 'corporate', 'organization', 'firm', 'offer letter', 'appointment letter', 'joining letter',
        'experience letter', 'relieving letter', 'service letter', 'salary slip', 'payslip', 'ctc', 'increment', 'appraisal',
        'hr', 'human resource', 'attendance', 'startup', 'msme', 'udyam', 'gst registration',
        'freelance', 'contractor', 'vendor', 'client'
      ],
      icon: 'briefcase',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'personal', 'private', 'family', 'home', 'household', 'personal documents',
        'marriage', 'wedding', 'marriage certificate', 'birth', 'birth certificate',
        'death', 'death certificate', 'spouse', 'husband', 'wife',
        'children', 'kids', 'son', 'daughter', 'family tree', 'family id', 'samagra',
        'nominee', 'guardian', 'dependent', 'photos', 'memories', 'personal records'
      ],
      icon: 'user',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'travel', 'trip', 'vacation', 'journey', 'flight', 'hotel', 'booking',
        'ticket', 'visa', 'tourism', 'train', 'railway', 'irctc', 'pnr',
        'bus', 'volvo', 'redbus', 'boarding pass', 'itinerary',
        'passport', 'immigration', 'tour package', 'holiday',
        'char dham', 'kedarnath', 'badrinath', 'amarnath', 'vaishno devi'
      ],
      icon: 'airplane',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'tax', 'taxes', 'income tax', 'return', 'filing', 'itr', 'tds', 'gst',
        'pan', 'tan', 'assessment', 'form 16', 'form 16a', 'form 26as',
        'advance tax', 'self assessment tax', 'tax challan', 'refund', 'demand notice',
        'gst return', 'gstr', 'gstr-1', 'gstr-3b', 'professional tax', 'property tax',
        'municipal tax'
      ],
      icon: 'calculator',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'property', 'real estate', 'house', 'home', 'apartment', 'flat', 'villa',
        'plot', 'land', 'site', 'residential', 'commercial',
        'rent', 'rental', 'lease', 'mortgage', 'sale deed', 'registry', 'registration', 'encumbrance',
        'ec', 'khata', 'patta', 'rtc', '7/12', '7-12', 'pahani', 'mutation', 'jamabandi',
        'builder', 'society', 'maintenance', 'possession letter', 'allotment letter',
        'property tax', 'municipal tax'
      ],
      icon: 'home',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'vehicle', 'car', 'bike', 'motorcycle', 'scooter', 'auto',
        'registration', 'rc', 'vehicle documents', 'driving licence', 'dl', 'learner licence', 'll',
        'puc', 'pollution', 'insurance', 'road tax', 'permit', 'fitness certificate',
        'chassis number', 'engine number', 'service record', 'service history',
        'traffic challan', 'e-challan'
      ],
      icon: 'truck',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'bill', 'bills', 'electricity', 'water', 'gas', 'utility',
        'receipt', 'invoice', 'electricity bill', 'water bill', 'gas bill',
        'lpg', 'png', 'cylinder', 'mobile bill', 'postpaid', 'prepaid',
        'internet', 'broadband', 'wifi', 'dth', 'cable tv', 'recharge',
        'maintenance bill', 'society bill'
      ],
      icon: 'currency-rupee',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'shop', 'shopping', 'purchase', 'order', 'cart', 'buy', 'store',
        'amazon', 'flipkart', 'myntra', 'meesho', 'ajio',
        'snapdeal', 'nykaa', 'invoice', 'bill', 'receipt',
        'return', 'refund', 'exchange', 'warranty', 'guarantee',
        'emi purchase', 'no cost emi'
      ],
      icon: 'shopping-bag',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'music', 'song', 'audio', 'mp3', 'recording', 'sound',
        'bollywood', 'hindi songs', 'devotional',
        'bhajan', 'aarti', 'mantra', 'chant',
        'podcast', 'voice note', 'call recording', 'ringtone', 'playlist'
      ],
      icon: 'musical-note',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'video', 'movie', 'film', 'clip', 'mp4', 'recording',
        'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm',
        'bollywood', 'south movie', 'tollywood', 'kollywood',
        'hindi movie', 'telugu movie', 'tamil movie', 'malayalam movie',
        'web series', 'ott', 'netflix', 'amazon prime', 'hotstar', 'zee5',
        'reel', 'shorts', 'youtube video', 'screen recording',
        'meeting recording', 'zoom recording'
      ],
      icon: 'video-camera',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'image', 'photo', 'picture', 'pic', 'gallery', 'album', 'screenshot',
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'heic', 'webp',
        'camera photo', 'selfie', 'wedding photo',
        'festival', 'diwali', 'holi', 'navratri',
        'scan', 'scanned copy', 'document scan',
        'whatsapp image', 'profile photo', 'passport photo'
      ],
      icon: 'photo',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'code', 'program', 'script', 'developer', 'software', 'app',
        'project', 'sode', 'coding', 'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'c++',
        'html', 'css', 'solidity', 'sql', 'php', 'dart',
        'react', 'angular', 'vue', 'node', 'express',
        'firebase', 'aws', 'azure', 'frontend', 'backend', 'fullstack',
        'api', 'json', 'database', 'git', 'github', 'repo', 'repository',
        'build', 'deploy', 'release'
      ],
      icon: 'code-bracket',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'cloud', 'backup', 'backups', 'storage', 'drive', 'sync', 'synced', 'restore', 'restoration',
        'google drive', 'gdrive', 'onedrive', 'dropbox', 'icloud', 'mega', 'box',
        'cloud files', 'cloud storage', 'cloud data',
        'backup files', 'backup copy', 'full backup', 'incremental backup',
        'offline backup', 'local backup', 'external drive', 'hard disk', 'pendrive', 'usb',
        'export', 'import', 'restore point', 'snapshot', 'version', 'versioning'
      ],
      icon: 'cloud',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'password', 'passwords', 'passcode', 'pin', 'mpin', 'security', 'secure', 'secured',
        'secret', 'secrets', 'private', 'confidential', 'credentials', 'login', 'logins',
        'username', 'userid', 'user id',
        'otp', '2fa', 'mfa', 'authentication', 'authorization',
        'private key', 'public key', 'recovery key', 'recovery phrase', 'seed', 'seed phrase',
        'wallet key', 'vault', 'locker', 'safe', 'encrypted', 'encryption', 'decrypt', 'hash'
      ],
      icon: 'lock-closed',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'archive', 'archives', 'archived', 'old', 'older', 'previous', 'past', 'history',
        'backup copy', 'old files', 'old documents', 'past records', 'legacy',
        'zip', 'rar', '7z', 'compressed', 'compression', 'extract',
        'obsolete', 'deprecated', 'inactive', 'unused', 'closed'
      ],
      icon: 'archive-box',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'important', 'importance', 'urgent', 'urgency', 'priority', 'priorities',
        'critical', 'high priority', 'top', 'top files', 'pinned', 'pin',
        'star', 'starred', 'favorite', 'favourite', 'essential', 'mandatory',
        'must', 'required', 'attention', 'attention needed', 'review'
      ],
      icon: 'star',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'email', 'emails', 'mail', 'mails', 'gmail', 'outlook', 'yahoo mail',
        'message', 'messages', 'chat', 'chats', 'conversation', 'thread',
        'whatsapp', 'telegram', 'signal', 'sms', 'text', 'text message',
        'attachments', 'email attachment', 'mail attachment',
        'inbox', 'sent', 'draft', 'spam'
      ],
      icon: 'envelope',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'appointment', 'appointments', 'schedule', 'schedules', 'meeting', 'meetings',
        'calendar', 'event', 'events', 'slot', 'time slot',
        'doctor appointment', 'hospital visit', 'court date', 'hearing date',
        'interview', 'interview schedule',
        'meeting notes', 'agenda', 'minutes', 'mom', 'follow up'
      ],
      icon: 'calendar',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'visa', 'visas', 'immigration', 'migration', 'emigration',
        'work visa', 'student visa', 'tourist visa', 'business visa',
        'resident permit', 'pr', 'permanent residency', 'green card',
        'citizenship', 'passport submission',
        'embassy', 'consulate', 'high commission',
        'foreign travel', 'overseas', 'abroad'
      ],
      icon: 'globe-alt',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'notes', 'note', 'notebook', 'text', 'text file', 'writing', 'draft', 'drafts',
        'idea', 'ideas', 'thought', 'thoughts', 'journal', 'diary',
        'todo', 'to-do', 'todo list', 'task', 'tasks', 'checklist',
        'memo', 'rough', 'rough work'
      ],
      icon: 'pencil-square',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'report', 'reports', 'analysis', 'analytics', 'analytical',
        'summary', 'overview', 'review', 'insight', 'insights',
        'data', 'dataset', 'data set', 'raw data',
        'metrics', 'statistics', 'numbers', 'figures',
        'performance', 'progress', 'status'
      ],
      icon: 'chart-bar',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'certificate', 'certificates', 'certification',
        'achievement', 'achievements', 'award', 'awards',
        'recognition', 'merit', 'honor', 'honour',
        'completion certificate', 'course certificate',
        'participation certificate', 'training certificate',
        'medal', 'trophy'
      ],
      icon: 'trophy',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'template', 'templates', 'form', 'forms', 'format', 'formats',
        'sample', 'samples', 'example', 'examples',
        'application form', 'registration form', 'admission form',
        'pdf form', 'fillable', 'editable',
        'blank', 'pre-filled', 'structure'
      ],
      icon: 'document-text',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'apk', 'ipa', 'app file', 'app files', 'installer', 'installers',
        'mobile app', 'android app', 'ios app',
        'setup', 'installation', 'package', 'package file',
        'build', 'release build', 'debug build',
        'update', 'patch'
      ],
      icon: 'device-phone-mobile',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'game', 'games', 'gaming', 'entertainment', 'fun',
        'play', 'player', 'pc game', 'console game', 'mobile game',
        'save file', 'save data', 'game data', 'progress',
        'levels', 'mods', 'mod files'
      ],
      icon: 'controller',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'shared', 'sharing', 'share', 'collaboration', 'collaborate',
        'team', 'teams', 'group', 'groups', 'public', 'private share',
        'access', 'permissions', 'roles',
        'shared folder', 'shared files', 'shared documents',
        'invite', 'member', 'members'
      ],
      icon: 'users',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'download', 'downloads', 'downloaded', 'downloading',
        'received', 'incoming', 'inbox files',
        'attachments', 'received files',
        'imported', 'fetched', 'pulled'
      ],
      icon: 'arrow-down-tray',
      color: 'bg-blue-50'
    },
    {
      keywords: [
        'temp', 'temporary', 'tmp',
        'draft', 'drafts', 'in progress', 'working', 'work in progress', 'wip',
        'testing', 'test', 'trial', 'demo', 'sample', 'sandbox',
        'staging', 'preview'
      ],
      icon: 'beaker',
      color: 'bg-blue-50'
    }
  ];

  constructor() { }

  getFolderProperties(folderName: string): { icon: string, color: string } {
    const name = folderName.toLowerCase().trim();

    for (const mapping of this.folderMappings) {
      if (mapping.keywords.some(keyword => name.includes(keyword))) {
        return { icon: mapping.icon, color: mapping.color };
      }
    }
    return { icon: 'folder', color: 'bg-blue-50' };
  }

  // Helper to get raw mappings if needed (e.g. for debugging or displaying list)
  getAllMappings(): IconMapping[] {
    return this.folderMappings;
  }

  getIconSvg(iconName: string): string {
    const icons: { [key: string]: string } = {
      'identification': 'M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zM6.75 9.75h2.25v2.25H6.75V9.75z',
      'academic-cap': 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5',
      'heart': 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z',
      'building-library': 'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z',
      'shield-check': 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
      'scale': 'M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.589-1.202L18.75 4.97zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.589-1.202L5.25 4.97z',
      'briefcase': 'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z',
      'user': 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
      'airplane': 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25V13.5a2.25 2.25 0 00-2.25-2.25H15a3 3 0 01-3-3V5.25a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v1.5z',
      'calculator': 'M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zM12 13.5h.008v.008H12V13.5zm0 2.25h.008v.008H12v-.008zm0 2.25h.008V18H12v-.008zM15.75 13.5h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zM6 7.5h12A1.5 1.5 0 0119.5 9v10.5a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 01-1.5-1.5V9A1.5 1.5 0 016 7.5zM10.5 4.5a.75.75 0 00-.75.75v.75h4.5v-.75a.75.75 0 00-.75-.75h-3z',
      'home': 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
      'truck': 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m15.75 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125A1.125 1.125 0 0021 17.625v-3.375m-9-3.75h5.25m0 0V8.25a2.25 2.25 0 00-2.25-2.25H9a2.25 2.25 0 00-2.25 2.25v1.5m5.25-1.5a1.5 1.5 0 00-1.5-1.5H9.75a1.5 1.5 0 00-1.5 1.5v1.5M12 9.75v1.5m0-1.5h3.75m-3.75 0H8.25',
      'folder': 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25H11.69z',
      'document': 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
      'share': 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
      'pdf': 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
      'currency-rupee': 'M15 8.25H9m6 3H9m3 6l-3-3h1.5a3 3 0 100-6M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      'shopping-bag': 'M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
      'musical-note': 'M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z',
      'video-camera': 'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z',
      'photo': 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
      'code-bracket': 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5',
      'image': 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
      'cloud': 'M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z',
      'lock-closed': 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
      'archive-box': 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
      'star': 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.563.045.796.77.361 1.135l-4.223 3.535a.562.562 0 00-.182.556l1.285 5.378a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.379a.562.562 0 00-.182-.556l-4.223-3.536a.562.562 0 01.361-1.135l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
      'envelope': 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
      'calendar': 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
      'globe-alt': 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418',
      'pencil-square': 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
      'chart-bar': 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
      'trophy': 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0',
      'document-text': 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
      'device-phone-mobile': 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
      'controller': 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
      'users': 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
      'arrow-down-tray': 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
      'beaker': 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    };
    return icons[iconName] || icons['folder'];
  }
}
