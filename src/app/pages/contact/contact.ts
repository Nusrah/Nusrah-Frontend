import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss']
})
export class ContactComponent {
  // Contact details (change here once, the whole page updates)
  readonly supportEmail = 'nusrah.support@gmail.com';
  readonly whatsappNumber = '919876543210'; // country code + number, digits only (no + or spaces)
  readonly whatsappDisplay = '+91 98765 43210';
  readonly instagramDisplay = '@nusrah.in';
  readonly instagramLink = 'https://www.instagram.com/nusrah.in/';
  readonly twitterDisplay = '@nusrah_in'; // change to your real X handle
  readonly twitterLink = 'https://x.com/nusrah_in'; // change to your real X profile

  // Opens WhatsApp directly to the support chat
  get whatsappLink(): string {
    const text = 'Assalamu Alaikum, I would like to get in touch with Nusrah.';
    return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(text)}`;
  }

  readonly infoCards = [
    {
      icon: '⏳',
      title: 'Response Time',
      text: 'Every message is read by a real person on our team.',
      points: [
        'Our team will respond as soon as possible.',
        'Replies can take a little longer during busy campaign periods.',
        'Please be patient, we have not missed your message.'
      ]
    },
    {
      icon: '📝',
      title: 'Before You Write',
      text: 'A few details help us answer you faster and more accurately.',
      points: [
        'Mention the campaign name you are asking about.',
        'Include your name and the best way to reach you.',
        'Keep your question clear and to the point.'
      ]
    },
    {
      icon: '🤝',
      title: 'How We Can Help',
      text: 'We are here for donors, volunteers and the wider community.',
      points: [
        'Questions about campaigns and donations.',
        'Volunteering and local masjid assignment.',
        'Feedback and suggestions to improve our work.'
      ]
    }
  ];

  readonly verses = [
    {
      arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
      meaning: 'O you who believe, seek help through patience and prayer. Indeed, Allah is with the patient.',
      source: 'Surah Al-Baqarah 2:153'
    },
    {
      arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
      meaning: 'So indeed, with hardship comes ease. Indeed, with hardship comes ease.',
      source: 'Surah Ash-Sharh 94:5-6'
    },
    {
      arabic: 'وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ',
      meaning: 'And cooperate with one another in righteousness and piety.',
      source: 'Surah Al-Ma\u2019idah 5:2'
    },
    {
      arabic: 'وَاللَّهُ فِي عَوْنِ الْعَبْدِ مَا كَانَ الْعَبْدُ فِي عَوْنِ أَخِيهِ',
      meaning: 'Allah helps His servant as long as the servant helps his brother.',
      source: 'Sahih Muslim'
    }
  ];
}