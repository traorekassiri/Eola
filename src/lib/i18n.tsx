import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_CHAT_ICEBREAKERS,
  DEFAULT_COUNTRIES,
  DEFAULT_REPORT_REASONS,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_ZODIAC_ITEMS,
  parseCmsJson,
  type BilingualItem,
  type CountryItem,
} from './cms';
import type { SiteSettings } from '../types';

export type Language = 'fr' | 'en';

const STORAGE_KEY = 'zola_lang';

const COUNTRY_EN: Record<string, string> = {
  'Burkina Faso': 'Burkina Faso',
  "Côte d'Ivoire": 'Ivory Coast',
  Sénégal: 'Senegal',
  Mali: 'Mali',
  Bénin: 'Benin',
  Togo: 'Togo',
  Niger: 'Niger',
  Guinée: 'Guinea',
  Cameroun: 'Cameroon',
  Gabon: 'Gabon',
  Congo: 'Congo',
  'RD Congo': 'DR Congo',
  'République démocratique du Congo': 'Democratic Republic of the Congo',
  'Congo-Brazzaville': 'Republic of the Congo',
  Rwanda: 'Rwanda',
  Maroc: 'Morocco',
  Tunisie: 'Tunisia',
  Algérie: 'Algeria',
  Ghana: 'Ghana',
  Nigeria: 'Nigeria',
  Kenya: 'Kenya',
  'Afrique du Sud': 'South Africa',
};

const GENDER_EN: Record<string, string> = {
  Femme: 'Woman',
  Homme: 'Man',
  Tous: 'Everyone',
};

const ZODIAC_EN: Record<string, string> = {
  Bélier: 'Aries',
  Taureau: 'Taurus',
  Gémeaux: 'Gemini',
  Cancer: 'Cancer',
  Lion: 'Leo',
  Vierge: 'Virgo',
  Balance: 'Libra',
  Scorpion: 'Scorpio',
  Sagittaire: 'Sagittarius',
  Capricorne: 'Capricorn',
  Verseau: 'Aquarius',
  Poissons: 'Pisces',
};

const INTEREST_EN: Record<string, string> = {
  Voyage: 'Travel',
  Musique: 'Music',
  Cuisine: 'Cooking',
  Danse: 'Dance',
  Sport: 'Sports',
  Lecture: 'Reading',
  Cinéma: 'Cinema',
  Entrepreneuriat: 'Entrepreneurship',
  Photographie: 'Photography',
  Mode: 'Fashion',
  Nature: 'Nature',
  Technologie: 'Technology',
};

const PLAN_NAME_EN: Record<string, string> = {
  '1 mois': '1 month',
  '3 mois': '3 months',
  '6 mois': '6 months',
};

const PLAN_FEATURE_EN: Record<string, string> = {
  'Voir qui vous a liké': 'See who liked you',
  'Envoyer des messages illimités': 'Send unlimited messages',
  'Remonter son profil': 'Boost your profile',
  'Accès aux filtres avancés': 'Access advanced filters',
};

const REPORT_REASON_EN: Record<string, string> = {
  'Profil suspect ou faux': 'Suspicious or fake profile',
  'Comportement inapproprié': 'Inappropriate behavior',
  'Contenu offensant': 'Offensive content',
  'Harcèlement ou arnaque': 'Harassment or scam',
};

const STICKER_ORIGIN_EN: Record<string, string> = {
  'Adinkra • Amour & Patience': 'Adinkra • Love & Patience',
  'Adinkra • Harmonie': 'Adinkra • Harmony',
  "Afrique de l'Ouest • Joie": 'West Africa • Joy',
  'Motif Royal • Fierté': 'Royal Pattern • Pride',
  'Savane • Coucher de soleil': 'Savanna • Sunset',
  'Adinkra • Sagesse': 'Adinkra • Wisdom',
  'Hospitalité • Akwaaba': 'Hospitality • Akwaaba',
  'Masque • Prestige': 'Royal Mask • Prestige',
};

export const translations = {
  fr: {
    // Common
    'common.back': 'Retour',
    'common.close': 'Fermer',
    'common.cancel': 'Annuler',
    'common.save': 'Enregistrer',
    'common.send': 'Envoyer',
    'common.loading': 'Chargement...',
    'common.online': 'En ligne',
    'common.offline': 'Hors ligne',
    'common.verified': 'Profil vérifié',
    'common.years': 'ans',
    'common.langLabel': 'Langue',
    'common.switchLangTitle': 'Passer en anglais',

    // Legal & Match modal in App
    'legal.title': "Conditions d'utilisation & Politique de confidentialité",
    'legal.p1':
      'ZOLA est réservé aux personnes majeures (18 ans et plus). Les informations de profil et conversations privées sont protégées, accessibles uniquement aux participants autorisés, et jamais revendues à des tiers.',
    'legal.p2':
      "Tout comportement frauduleux, usurpation d'identité ou harcèlement peut être signalé et entraîne la suspension immédiate du compte par notre modération.",
    'match.itsAMatch': "C'est un",
    'match.matchWord': 'Match !',
    'match.mutualWith': 'Vous vous plaisez mutuellement avec {name} !',
    'match.sendMessage': 'Envoyer un message',
    'match.keepDiscovering': 'Continuer à découvrir',

    // Nav & AppShell
    'nav.discover': 'Découvrir',
    'nav.favorites': 'Favoris',
    'nav.messages': 'Messages',
    'nav.notifications': 'Notifications',
    'nav.alerts': 'Alertes',
    'nav.profile': 'Mon profil',
    'nav.profileShort': 'Profil',
    'nav.premium': 'Premium',
    'nav.settings': 'Paramètres',
    'nav.admin': 'Administration',
    'nav.home': "Page d'accueil",
    'nav.logout': 'Déconnexion',
    'nav.openMenu': 'Ouvrir le menu latéral',
    'nav.closeMenu': 'Fermer le menu',
    'nav.mainMenu': 'Menu principal',
    'nav.becomePremium': 'Devenir Premium',
    'nav.premiumActive': 'Premium actif',

    // Landing Page
    'landing.nav.home': 'Accueil',
    'landing.nav.discover': 'Découvrir',
    'landing.nav.features': 'Fonctionnalités',
    'landing.nav.why': 'Pourquoi ZOLA ?',
    'landing.nav.steps': 'Comment ça marche',
    'landing.nav.pricing': 'Tarifs',
    'landing.nav.faq': 'FAQ',
    'landing.nav.mySpace': 'Mon espace',
    'landing.nav.login': 'Se connecter',
    'landing.nav.signup': "S'inscrire",
    'landing.hero.defaultTitle': "Trouvez l'amour en Afrique",
    'landing.hero.highlight': 'Afrique',
    'landing.hero.defaultSubtitle':
      'Rencontrez des célibataires authentiques, près de chez vous ou partout en Afrique.',
    'landing.hero.ctaPrimary': 'Créer un compte',
    'landing.hero.ctaSecondary': 'En savoir plus',
    'landing.hero.activeMember': 'membre actif',
    'landing.hero.activeMembers': 'membres actifs',
    'landing.hero.verifiedBase': '{count} profil(s) vérifié(s) dans la base',
    'landing.hero.imgAlt': 'Couple africain souriant sur ZOLA',

    'landing.why.title': 'Pourquoi choisir ZOLA ?',
    'landing.why.subtitle':
      'Une plateforme pensée pour des rencontres sincères, sécurisées et authentiques à travers le continent.',
    'landing.why.c1.title': 'Profils vérifiés et sécurisés',
    'landing.why.c1.desc':
      'Contrôle rigoureux des membres par selfie défi et outils de signalement pour des échanges en toute confiance.',
    'landing.why.c2.title': 'Rencontres en Afrique',
    'landing.why.c2.desc':
      'Explorez des profils à Ouagadougou, Abidjan, Dakar, Bamako, Douala ou partout sur le continent.',
    'landing.why.c3.title': 'Connexion rapide',
    'landing.why.c3.desc':
      'Matchs instantanés et messagerie privée en temps réel avec notes vocales, stickers et appels audio/vidéo.',
    'landing.why.c4.title': 'Fonctionnalités Premium',
    'landing.why.c4.desc':
      'Découvrez qui vous a liké, remontez votre profil et payez en FCFA via SasPay en toute sécurité.',

    'landing.bento.title': 'Des outils conçus pour des échanges authentiques',
    'landing.bento.subtitle':
      'Découvrez, sauvegardez vos favoris et conversez avec des fonctionnalités modernes pensées pour le continent.',
    'landing.bento.b1.tag': 'Découverte · Favoris · Compatibilité',
    'landing.bento.b1.title': 'Filtres africains précis & liste de Favoris dédiée',
    'landing.bento.b1.desc':
      'Recherchez des profils à Abidjan, Dakar, Ouagadougou, Bamako, Douala ou dans la diaspora selon vos centres d’intérêt. Enregistrez les profils marquants dans vos Favoris pour y revenir plus tard.',
    'landing.bento.b1.f1': 'Filtres pays & ville',
    'landing.bento.b1.f2': 'Score d’affinités réel',
    'landing.bento.b1.f3': 'Super Like prioritaire',
    'landing.bento.b2.tag': 'Audio · Vidéo · Vocal',
    'landing.bento.b2.title': 'Appels audio/vidéo & messages vocaux',
    'landing.bento.b2.desc':
      'Entendez la voix de votre Match avant votre premier rendez-vous grâce aux notes vocales et appels WebRTC en direct.',
    'landing.bento.b3.tag': 'Culture · Expression',
    'landing.bento.b3.title': 'Stickers culturels africains & réactions',
    'landing.bento.b3.desc':
      'Brisez la glace avec nos stickers illustrés (Akwaaba, Cœur Kente, Masque Royal, Tambour Djembé, Soleil du Sahel) et des réactions instantanées.',
    'landing.bento.b4.tag': 'Selfie défi · Blocage · 2FA',
    'landing.bento.b4.title': 'Sécurité renforcée, vérification selfie et blocage en un clic',
    'landing.bento.b4.desc':
      'Les métadonnées EXIF/GPS de vos photos sont automatiquement supprimées à l’envoi. Vous gardez le contrôle total grâce à la vérification par selfie défi, la double authentification (2FA), le signalement et le blocage instantané des profils et conversations.',
    'landing.bento.b4.f1': 'Suppression EXIF/GPS',
    'landing.bento.b4.f2': 'Modération active',
    'landing.bento.b4.f3': 'Blocage immédiat',

    'landing.steps.title': 'Des rencontres sincères en trois étapes simples',
    'landing.steps.subtitle':
      'Une progression claire, sans algorithme opaque, centrée sur les affinités et la sécurité.',
    'landing.steps.s1.title': '01. Créez votre profil vérifié',
    'landing.steps.s1.desc':
      'Renseignez votre ville, vos centres d’intérêt et confirmez votre identité par selfie défi pour inspirer confiance dès le premier regard.',
    'landing.steps.s2.title': '02. Explorez par affinités et Favoris',
    'landing.steps.s2.desc':
      'Filtrez par pays, ville et centres d’intérêt, sauvegardez vos coups de cœur en Favoris et envoyez un Like ou Super Like ciblé.',
    'landing.steps.s3.title': '03. Matchez, appelez et échangez',
    'landing.steps.s3.desc':
      'Dès qu’un intérêt est mutuel, discutez en privé avec notes vocales, stickers culturels africains et appels audio ou vidéo chiffrés.',

    'landing.stats.activeMembers': 'Membres actifs inscrits',
    'landing.stats.verifiedProfiles': 'Profils vérifiés par selfie',
    'landing.stats.mutualMatches': 'Matchs mutuels créés',
    'landing.stats.countries': 'Pays représentés en ligne',

    'landing.quick.title': 'Préparez votre inscription en quelques secondes',
    'landing.quick.subtitle':
      'Choisissez vos préférences de départ pour accéder directement aux profils compatibles.',
    'landing.quick.iAm': 'Je suis',
    'landing.quick.seeking': 'Je recherche',
    'landing.quick.country': 'Pays',
    'landing.quick.start': 'Commencer',
    'landing.recent.title': 'Membres récemment actifs',
    'landing.recent.seeMore': 'Voir plus',
    'landing.recent.verified': 'Profil vérifié',

    'landing.testimonials.title': 'Histoires de membres à travers l’Afrique',
    'landing.testimonials.subtitle':
      'Des rencontres réelles nées de profils authentiques et d’échanges respectueux.',
    'landing.testimonials.t1.quote':
      'Après plusieurs déceptions sur des applications impersonnelles, nous avons échangé dès le premier soir grâce aux badges vérifiés et aux appels audio intégrés. Six mois plus tard, nous préparons nos fiançailles.',
    'landing.testimonials.t2.quote':
      'Le filtre par ville et par centres d’intérêt change tout. J’ai rencontré des personnes sérieuses partageant les mêmes valeurs entrepreneuriales et familiales.',
    'landing.testimonials.t3.quote':
      'Pouvoir mettre un profil en Favori, bloquer immédiatement tout comportement déplacé et discuter avec les stickers culturels rend l’expérience chaleureuse et rassurante.',

    'landing.pricing.title': 'Devenez Premium',
    'landing.pricing.subtitle': 'Profitez d’avantages exclusifs pour multiplier vos rencontres.',
    'landing.pricing.saspayNote':
      'Paiement sécurisé exclusivement via SasPay · Orange Money, MTN, Moov, Wave & Carte Bancaire',
    'landing.pricing.popular': 'Formule la plus choisie',
    'landing.pricing.payWithSaspay': "S'abonner",

    'landing.faq.title': 'Questions fréquentes',
    'landing.faq.q1': 'Comment fonctionne la vérification des profils sur ZOLA ?',
    'landing.faq.a1':
      "Chaque membre peut soumettre un selfie accompagné d'un code défi unique depuis son profil. Notre équipe de modération valide ensuite le badge vérifié pour renforcer l'authenticité de la communauté.",
    'landing.faq.q2': 'ZOLA est-il disponible dans tous les pays africains et la diaspora ?',
    'landing.faq.a2':
      "Oui. ZOLA connecte les célibataires d'Afrique de l'Ouest, Centrale, de l'Est, du Nord et d'Afrique Australe ainsi que de la diaspora, avec des filtres précis par pays, ville et centres d'intérêt.",
    'landing.faq.q3': 'Comment fonctionne le système de Match, d’appels et de confidentialité ?',
    'landing.faq.a3':
      'Seul un intérêt mutuel ouvre une messagerie privée. Vous pouvez y envoyer messages, notes vocales, stickers culturels, lancer des appels audio/vidéo WebRTC, et bloquer à tout moment un profil indésirable.',
    'landing.faq.q4': 'Quels moyens de paiement sont acceptés pour ZOLA Premium ?',
    'landing.faq.a4':
      'Tous les abonnements ZOLA Premium (1 mois, 3 mois ou 6 mois en FCFA) sont traités exclusivement via SasPay, acceptant Orange Money, MTN Mobile Money, Moov Money, Wave ainsi que les cartes Visa et Mastercard avec vérification serveur par webhook signé.',

    'landing.cta.titlePrefix': 'Rejoignez dès maintenant la communauté de',
    'landing.cta.titleHighlight': 'rencontres africaines',
    'landing.cta.subtitle':
      'Créez votre profil gratuitement en moins de deux minutes et découvrez des célibataires près de chez vous.',
    'landing.cta.btnAuth': 'Accéder à la découverte',
    'landing.cta.btnGuest': 'Créer mon compte gratuitement',

    'landing.footer.slogan': "Ensemble, trouvons l'amour",
    'landing.footer.saspay': 'Paiements sécurisés par SasPay',
    'landing.footer.nav': 'Navigation',
    'landing.footer.pricing': 'Tarifs Premium',
    'landing.footer.legal': 'Légal & Sécurité',
    'landing.footer.terms': "Conditions d'utilisation",
    'landing.footer.privacy': 'Politique de confidentialité',
    'landing.footer.safety': 'Sécurité & Modération',
    'landing.footer.access': 'Accès & Support',
    'landing.footer.manageSub': 'Gérer mon abonnement SasPay',
    'landing.footer.mySpace': 'Accéder à mon espace',
    'landing.footer.rights': '© 2026 ZOLA. Tous droits réservés.',

    // Auth Views
    'auth.backHome': "Retour à l'accueil",
    'auth.side.register': 'Rejoignez une communauté authentique et bienveillante.',
    'auth.side.login': 'Ravi de vous retrouver sur ZOLA.',
    'auth.side.sub': 'Des rencontres sincères partout en Afrique et dans la diaspora.',
    'auth.login.title': 'Connexion',
    'auth.login.sub': 'Bon retour parmi nous !',
    'auth.login.emailPlaceholder': 'Votre email',
    'auth.login.passwordPlaceholder': 'Mot de passe',
    'auth.login.rememberMe': 'Se souvenir de moi',
    'auth.login.forgot': 'Mot de passe oublié ?',
    'auth.login.2faPrompt': 'Entrez le code à 6 chiffres généré par votre application 2FA.',
    'auth.login.2faPlaceholder': 'Code 2FA à 6 chiffres',
    'auth.login.backToCreds': 'Revenir aux identifiants',
    'auth.login.submit': 'Se connecter',
    'auth.login.submitting': 'Connexion...',
    'auth.login.verify2fa': 'Vérifier le code 2FA',
    'auth.login.oauthSep': 'Ou se connecter avec',
    'auth.login.noAccount': 'Pas encore de compte ?',
    'auth.login.createOne': 'Créer un compte',
    'auth.login.quickTest': 'Accès test rapide :',
    'auth.login.memberDemo': 'Membre (Awa)',
    'auth.login.adminDemo': 'Administrateur',
    'auth.register.title': 'Créer un compte',
    'auth.register.sub': 'Rejoignez notre communauté et trouvez votre âme sœur.',
    'auth.register.continueWith': 'Continuer avec {provider}',
    'auth.register.fullName': 'Nom et prénom',
    'auth.register.passwordConfirm': 'Confirmer le mot de passe',
    'auth.register.birthDate': 'Date de naissance',
    'auth.register.gender': 'Genre',
    'auth.register.seeking': 'Je recherche',
    'auth.register.country': 'Pays',
    'auth.register.city': 'Ville',
    'auth.register.termsPrefix': "J'ai au moins 18 ans et j'accepte les",
    'auth.register.termsLink': "conditions d'utilisation",
    'auth.register.termsSuffix': 'et la politique de confidentialité de ZOLA.',
    'auth.register.submit': "S'inscrire",
    'auth.register.submitting': 'Création du compte...',
    'auth.register.hasAccount': 'Déjà un compte ?',
    'auth.register.mismatch': 'Les mots de passe ne correspondent pas.',
    'auth.register.mustAccept': "Veuillez accepter les conditions d'utilisation.",
    'auth.forgot.title': 'Mot de passe oublié',
    'auth.forgot.sub': 'Réinitialisez votre accès en toute sécurité.',
    'auth.forgot.emailPlaceholder': 'Votre adresse email',
    'auth.forgot.sendBtn': 'Recevoir le jeton de réinitialisation',
    'auth.forgot.sending': 'Envoi...',
    'auth.forgot.tokenPlaceholder': 'Jeton reçu par email',
    'auth.forgot.newPassPlaceholder': 'Nouveau mot de passe (8 caractères min.)',
    'auth.forgot.confirmBtn': 'Valider le nouveau mot de passe',
    'auth.forgot.updating': 'Mise à jour...',
    'auth.forgot.backToLogin': 'Retour à la connexion',

    // Discover View
    'discover.title': 'Découvrir',
    'discover.countSingular': '{count} profil correspondant à vos critères.',
    'discover.countPlural': '{count} profils correspondants à vos critères.',
    'discover.tab.profiles': 'Profils',
    'discover.tab.likesMe': 'Vous aiment ({count})',
    'discover.reviewPassed': 'Revoir ({count})',
    'discover.reviewPassedTitle': 'Revoir les profils passés',
    'discover.boost': 'Remonter mon profil',
    'discover.goPremium': 'Passer Premium',
    'discover.searchPlaceholder': 'Rechercher par prénom, ville, profession...',
    'discover.sort.compatibility': 'Tri : Affinité',
    'discover.sort.recent': 'Tri : Activité récente',
    'discover.gender.all': 'Tous les genres',
    'discover.gender.women': 'Femmes',
    'discover.gender.men': 'Hommes',
    'discover.filters': 'Filtres',
    'discover.filter.country': 'Pays',
    'discover.filter.allCountries': 'Tous les pays',
    'discover.filter.city': 'Ville',
    'discover.filter.cityPlaceholder': 'Ex: Dakar, Abidjan...',
    'discover.filter.age': 'Âge ({min} - {max} ans)',
    'discover.filter.interest': "Centre d'intérêt",
    'discover.filter.allInterests': 'Tous',
    'discover.filter.verifiedOnly': 'Profils vérifiés',
    'discover.empty.title': 'Aucun profil trouvé',
    'discover.empty.desc':
      "Ajustez vos filtres ou réinitialisez les profils passés pour découvrir d'autres membres.",
    'discover.empty.resetFilters': 'Réinitialiser les filtres',
    'discover.empty.reviewPassed': 'Revoir les profils passés',
    'discover.swipeHint':
      'Glissez une carte vers la droite pour aimer ou vers la gauche pour passer',
    'discover.loadMore': 'Charger plus de profils',
    'discover.stamp.like': "J'AIME",
    'discover.stamp.pass': 'PASSER',
    'discover.boosted': 'Boosté',
    'discover.affinity': '{score}% affinité',
    'discover.favAdd': 'Ajouter aux favoris',
    'discover.favRemove': 'Retirer des favoris',
    'discover.pass': 'Passer',
    'discover.superLike': 'Coup de cœur (Super-Like)',
    'discover.likesMe.lockedTitle': '{count} personne(s) vous ont liké',
    'discover.likesMe.lockedTitleOne': '1 personne vous a liké',
    'discover.likesMe.lockedDesc':
      "Passez à ZOLA Premium pour découvrir immédiatement qui s'intéresse à votre profil et créer un Match sans attendre.",
    'discover.likesMe.unlockBtn': 'Voir avec ZOLA Premium',
    'discover.likesMe.empty': "Personne n'a encore liké votre profil pour le moment.",

    // Favorites View
    'fav.title': 'Mes Favoris',
    'fav.savedSingular': '{count} profil sauvegardé pour plus tard.',
    'fav.savedPlural': '{count} profils sauvegardés pour plus tard.',
    'fav.browseDiscover': "Découvrir d'autres profils",
    'fav.searchPlaceholder': 'Filtrer vos favoris par prénom, ville ou pays...',
    'fav.empty.title': 'Aucun profil en favori',
    'fav.empty.desc':
      "Enregistrez des profils qui attirent votre attention depuis l'espace Découvrir ou depuis leur fiche membre pour les retrouver rapidement ici.",
    'fav.empty.cta': 'Explorer les profils',
    'fav.noMatch': 'Aucun favori ne correspond à « {query} ».',
    'fav.removedMsg': '{name} a été retiré de vos favoris.',
    'fav.likedMsg': "J'aime envoyé à {name}.",
    'fav.sendMessage': 'Envoyer un message',
    'fav.alreadyLiked': 'Déjà aimé',
    'fav.sendLike': "Envoyer un J'aime",

    // Member Profile View
    'member.notFound': 'Ce profil est introuvable ou inaccessible.',
    'member.sign': 'Signe : {sign}',
    'member.aboutMe': 'À propos de moi',
    'member.noBio': "Ce membre n'a pas encore rédigé de description personnelle.",
    'member.interests': "Centres d'intérêt",
    'member.editOwn': 'Modifier mon profil',
    'member.sendMessage': 'Envoyer un message',
    'member.like': "J'aime",
    'member.liked': 'Aimé',
    'member.superLike': 'Coup de cœur',
    'member.superLikeTitle': 'Coup de cœur prioritaire',
    'member.inFavorites': 'Dans mes favoris',
    'member.saveFavorite': 'Sauvegarder en favori',
    'member.report': 'Signaler',
    'member.block': 'Bloquer ce profil',
    'member.superLikeSent': 'Coup de cœur prioritaire envoyé à {name} !',
    'member.likeSent': "Vous avez envoyé un J'aime à {name}.",
    'member.matchFirstHint':
      "Aimez ce profil : dès qu'il vous aime en retour, la discussion privée s'ouvre !",
    'member.reportModalTitle': 'Signaler {name}',
    'member.reportReason': 'Motif',
    'member.reportDetails': 'Précisions',
    'member.reportPlaceholder': 'Décrivez brièvement la situation...',
    'member.reportSubmit': 'Envoyer le signalement',
    'member.blockModalTitle': 'Bloquer {name} ?',
    'member.blockModalSub': 'Action immédiate et sécurisée',
    'member.blockModalDesc':
      '{name} ne pourra plus voir votre profil ni vous envoyer de messages. Tout match et toute conversation en cours avec ce profil seront immédiatement supprimés.',
    'member.blocking': 'Blocage...',
    'member.blockConfirm': 'Confirmer le blocage',

    // Messages View
    'msg.title': 'Messages',
    'msg.discussions': '{count} discussion(s)',
    'msg.searchPlaceholder': 'Rechercher une conversation...',
    'msg.noMatches':
      'Aucun Match pour le moment. Aimez des profils dans Découvrir pour démarrer une conversation !',
    'msg.voiceNote': 'Message vocal',
    'msg.photoSent': 'Photo envoyée',
    'msg.newMatchHello': 'Nouveau Match ! Dites bonjour',
    'msg.selectConv': 'Sélectionnez une conversation',
    'msg.selectConvSub': 'Vos échanges privés sont accessibles uniquement aux participants du Match.',
    'msg.typing': "en train d'écrire...",
    'msg.audioCall': 'Appel audio',
    'msg.videoCall': 'Appel vidéo',
    'msg.viewProfile': 'Voir le profil',
    'msg.reportMember': 'Signaler ce membre',
    'msg.blockMember': 'Bloquer ce membre',
    'msg.icebreakerTitle': 'Briser la glace avec {name}',
    'msg.ice1': "Salut ! J'adore ton profil, quel est ton endroit préféré dans ta ville ?",
    'msg.ice2': 'Plutôt café du matin ou balade au coucher du soleil ?',
    'msg.ice3': 'Quelle chanson ou quel artiste écoutes-tu en boucle en ce moment ?',
    'msg.react': 'Réagir',
    'msg.stickersTitle': 'Stickers culturels africains',
    'msg.imageReady': 'Image prête : {name}',
    'msg.remove': 'Retirer',
    'msg.sendPhotoTitle': 'Envoyer une photo',
    'msg.stickersBtnTitle': 'Stickers culturels',
    'msg.emojisBtnTitle': 'Émoticônes',
    'msg.voiceBtnTitle': 'Message vocal',
    'msg.recording': 'Enregistrement vocal... {seconds}s',
    'msg.inputPlaceholder': 'Écrire un message...',
    'msg.call.callingVideo': 'Appel vidéo en cours...',
    'msg.call.callingAudio': 'Appel audio en cours...',
    'msg.call.incomingVideo': 'Appel vidéo entrant',
    'msg.call.incomingAudio': 'Appel audio entrant',
    'msg.call.connected': 'Communication active',
    'msg.call.answer': 'Répondre',
    'msg.call.decline': 'Refuser',
    'msg.reportSent': 'Signalement transmis à notre équipe de modération.',
    'msg.micDenied': 'Microphone inaccessible. Vérifiez les permissions du navigateur.',
    'msg.mediaDenied': "Impossible d'accéder au microphone ou à la caméra pour démarrer l'appel.",
    'msg.permDenied': 'Permission microphone/caméra refusée.',

    // Premium View
    'premium.title': 'Devenez Premium',
    'premium.sub': "Profitez de plus d'avantages",
    'premium.popular': 'Populaire',
    'premium.gatewayTitle': 'Passerelle unique · SasPay',
    'premium.gatewayDesc': 'Orange Money, MTN, Moov, Wave & Carte Visa / Mastercard',
    'premium.payBtn': "S'abonner",
    'premium.initializing': 'Initialisation SasPay...',
    'premium.signedFooter': 'Tous les paiements sont traités et signés via SasPay (`docs.saspay.me`)',
    'premium.statusTitle': "Statut de l'abonnement",
    'premium.plan': 'Formule',
    'premium.status': 'Statut',
    'premium.active': 'Actif',
    'premium.startDate': 'Début',
    'premium.expiryDate': 'Expiration',
    'premium.freeDesc':
      'Vous utilisez actuellement le compte gratuit. Choisissez une formule ci-dessus pour activer ZOLA Premium via SasPay.',
    'premium.historyTitle': 'Historique des paiements',
    'premium.noTx': 'Aucune transaction enregistrée.',
    'premium.col.ref': 'Référence',
    'premium.col.plan': 'Formule',
    'premium.col.amount': 'Montant',
    'premium.col.status': 'Statut',
    'premium.col.receipt': 'Reçu',
    'premium.tx.completed': 'Confirmé',
    'premium.tx.pending': 'En attente',
    'premium.tx.failed': 'Échoué',
    'premium.checkoutTitle': 'Checkout SasPay',
    'premium.sessionSaspay': 'Session SasPay',
    'premium.totalToPay': 'Total à payer',
    'premium.hostedHint':
      'Votre session hébergée SasPay est prête. Réglez votre abonnement sur la page sécurisée SasPay, puis cliquez sur « Vérifier mon paiement ».',
    'premium.sandboxHint':
      'Mode sandbox local actif (`SASPAY_SECRET_KEY` non configurée). La validation vérifie cryptographiquement la transaction SasPay côté serveur (`/api/premium/verify` & webhook `/api/premium/webhook/saspay`).',
    'premium.openSaspay': 'Ouvrir SasPay',
    'premium.verifying': 'Vérification...',
    'premium.verifyBtn': 'Vérifier mon paiement',
    'premium.validateSandboxBtn': 'Valider le paiement SasPay',
    'premium.verifiedSuccess': 'Paiement SasPay vérifié et abonnement ZOLA Premium activé !',
    'premium.receiptTitle': 'Reçu de paiement ZOLA',
    'premium.paid': 'Payé',
    'premium.member': 'Membre',
    'premium.gateway': 'Passerelle',
    'premium.validatedAt': 'Date de validation',
    'premium.amountPaid': 'Montant payé',
    'premium.print': 'Imprimer',

    // Edit Profile, Settings, Notifications
    'edit.title': 'Modifier mon profil',
    'edit.viewProfile': 'Voir mon profil',
    'edit.changeAvatar': 'Changer la photo principale',
    'edit.gallery': 'Galerie photos',
    'edit.addPhoto': 'Ajouter',
    'edit.verifTitle': "Vérification d'identité",
    'edit.verifDone': 'Vérifié',
    'edit.verifPending': 'En attente',
    'edit.verifActiveDesc': 'Votre badge de profil vérifié est actif.',
    'edit.verifCodeHint': 'Envoyez un selfie tenant le code',
    'edit.verifCodeSuffix': 'pour obtenir le badge vérifié.',
    'edit.verifRejected': 'Refus précédent : {note}',
    'edit.verifSending': 'Demande en cours...',
    'edit.verifBtn': 'Envoyer mon selfie',
    'edit.fullName': 'Nom complet',
    'edit.birthDate': 'Date de naissance',
    'edit.gender': 'Genre',
    'edit.seeking': 'Genre recherché',
    'edit.country': 'Pays',
    'edit.city': 'Ville',
    'edit.profession': 'Profession',
    'edit.professionPlaceholder': 'Ex: Architecte',
    'edit.height': 'Taille (cm)',
    'edit.zodiac': 'Signe astrologique',
    'edit.zodiacUnspecified': 'Non précisé',
    'edit.interests': "Centres d'intérêt",
    'edit.aboutMe': 'À propos de moi',
    'edit.aboutPlaceholder': 'Parlez de vous, de vos passions et de ce que vous recherchez...',
    'edit.saving': 'Enregistrement...',
    'edit.saveBtn': 'Enregistrer les modifications',
    'edit.savedOk': 'Profil enregistré avec succès.',
    'edit.avatarUpdated': 'Photo de profil mise à jour.',
    'edit.photoAdded': 'Photo ajoutée à votre galerie.',

    'settings.title': 'Paramètres',
    'settings.nav.profile': 'Mon profil',
    'settings.nav.notifications': 'Notifications',
    'settings.nav.privacy': 'Confidentialité',
    'settings.nav.prefs': 'Préférences & Sécurité',
    'settings.nav.help': 'Aide & Support',
    'settings.nav.about': 'À propos',
    'settings.nav.logout': 'Se déconnecter',
    'settings.saved': 'Paramètres enregistrés.',
    'settings.notifMatchTitle': 'Notifications de Match',
    'settings.notifMatchDesc': "Recevoir une alerte lors d'un nouveau Match ou J'aime.",
    'settings.notifMsgTitle': 'Notifications de nouveaux messages',
    'settings.notifMsgDesc': "Être notifié lorsqu'un correspondant vous écrit.",
    'settings.visibilityTitle': 'Mon profil est visible par tous',
    'settings.visibilityDesc':
      "Désactivez cette option pour masquer temporairement votre profil dans l'espace Découverte.",
    'settings.langCardTitle': "Langue de l'interface",
    'settings.langCardDesc': 'Choisissez votre langue préférée pour toute la plateforme ZOLA.',
    'settings.passTitle': 'Modifier le mot de passe',
    'settings.passCurrent': 'Mot de passe actuel',
    'settings.passNew': 'Nouveau mot de passe (8 caractères min.)',
    'settings.passUpdate': 'Mettre à jour',
    'settings.2faTitle': 'Authentification à deux facteurs (2FA TOTP)',
    'settings.2faOn': 'Activée',
    'settings.2faOff': 'Désactivée',
    'settings.2faDisableDesc':
      'Votre compte est protégé par TOTP. Entrez un code actuel de votre application pour désactiver la 2FA.',
    'settings.2faCodePlaceholder': 'Code à 6 chiffres',
    'settings.2faDisableBtn': 'Désactiver la 2FA',
    'settings.2faSetupHint':
      'Ajoutez cette clé secrète dans Google Authenticator, Authy ou 1Password :',
    'settings.2faVerifyPlaceholder': 'Code de vérification (6 chiffres)',
    'settings.2faEnableBtn': 'Activer la 2FA',
    'settings.2faPromo':
      'Ajoutez une seconde couche de sécurité via code TOTP à 6 chiffres à chaque connexion.',
    'settings.2faSetupBtn': 'Configurer la 2FA',
    'settings.2faEnabledMsg': 'Authentification à deux facteurs (2FA) activée.',
    'settings.2faDisabledMsg': 'Authentification à deux facteurs (2FA) désactivée.',
    'settings.sessionsTitle': 'Sessions actives ({count})',
    'settings.sessionsEmpty': 'Aucune autre session enregistrée.',
    'settings.sessionsCurrent': 'Session actuelle',
    'settings.sessionsRevoke': 'Révoquer',
    'settings.sessionsRevokedMsg': 'Session révoquée.',
    'settings.sessionsActivity': 'IP : {ip} · Activité : {date}',
    'settings.deleteTitle': 'Supprimer mon compte définitivement',
    'settings.deleteDesc':
      'Cette action supprime votre profil, vos matchs et vos conversations de la base de données.',
    'settings.deletePlaceholder': 'Confirmez avec votre mot de passe',
    'settings.deleteBtn': 'Supprimer le compte',
    'settings.helpTitle': 'Aide et Support ZOLA',
    'settings.helpP1':
      'Pour toute question concernant la sécurité, un paiement Mobile Money ou une demande de vérification de profil, contactez notre équipe via support@zola.africa.',
    'settings.helpP2':
      'Astuce : vous pouvez signaler ou bloquer un comportement inapproprié directement depuis le profil du membre ou la messagerie.',
    'settings.aboutTitle': 'À propos de ZOLA',
    'settings.aboutP1':
      "ZOLA (« Ensemble, trouvons l'amour ») est une plateforme dédiée aux rencontres africaines authentiques, conçue pour relier les cœurs entre les grandes villes d'Afrique et sa diaspora.",

    'notif.title': 'Notifications',
    'notif.markAllRead': 'Tout marquer comme lu',
    'notif.empty': 'Aucune notification pour le moment.',

    // Admin Dashboard & Charts
    'admin.title': 'Administration ZOLA',
    'admin.activeRole': 'Rôle actif :',
    'admin.tab.overview': "Vue d'ensemble",
    'admin.tab.users': 'Utilisateurs ({count})',
    'admin.tab.verifs': 'Vérifications ({count})',
    'admin.tab.reports': 'Signalements ({count})',
    'admin.tab.payments': 'Paiements & Tarifs',
    'admin.tab.audit': "Journal d'audit",
    'admin.tab.settings': 'Gestion du Contenu',
    'admin.kpi.users': 'Membres inscrits',
    'admin.kpi.usersSub': '{verified} vérifié(s) · {online} en ligne',
    'admin.kpi.matches': 'Matchs & Messages',
    'admin.kpi.messagesSub': '{count} messages échangés',
    'admin.kpi.revenue': 'Revenus Premium',
    'admin.kpi.revenueSub': '{active} actif(s) · Conversion : {rate}%',
    'admin.kpi.moderation': 'Modération en attente',
    'admin.kpi.moderationSub': '{reports} signalement(s) · {verifs} vérif(s)',
    'admin.csv.title': 'Exports comptables & modération (CSV)',
    'admin.csv.desc':
      'Téléchargez les données brutes formatées UTF-8 pour Excel ou votre suivi comptable.',
    'admin.csv.users': 'Exporter Utilisateurs',
    'admin.csv.payments': 'Exporter Paiements',
    'admin.csv.reports': 'Exporter Signalements',
    'admin.chart.signupsTitle': 'Évolution des inscriptions par mois',
    'admin.chart.signupsSub': '{total} inscription(s) enregistrée(s) sur les {months} derniers mois',
    'admin.chart.months6': '6 mois',
    'admin.chart.months12': '12 mois',
    'admin.chart.revenueTitle': 'Revenus Premium mensuels (FCFA)',
    'admin.chart.revenueSub': '{total} FCFA sur la période',
    'admin.chart.countryTitle': 'Répartition géographique par pays',
    'admin.chart.countrySub': 'Top pays actifs de la communauté ZOLA',
    'admin.users.search': 'Filtrer par nom, email, ville...',
    'admin.users.prev': 'Précédent',
    'admin.users.next': 'Suivant',
    'admin.users.col.member': 'Membre',
    'admin.users.col.location': 'Localisation',
    'admin.users.col.role': 'Rôle',
    'admin.users.col.status': 'Statut',
    'admin.users.col.actions': 'Actions',
    'admin.users.active': 'Actif',
    'admin.users.suspended': 'Suspendu',
    'admin.users.unverify': 'Retirer vérif.',
    'admin.users.verify': 'Vérifier',
    'admin.users.suspend': 'Suspendre',
    'admin.users.reactivate': 'Réactiver',
    'admin.verifs.title': "Demandes de vérification d'identité",
    'admin.verifs.empty': 'Aucune demande de vérification soumise.',
    'admin.verifs.approve': 'Approuver',
    'admin.verifs.reject': 'Refuser',
    'admin.verifs.approved': 'Approuvé',
    'admin.verifs.rejected': 'Refusé',
    'admin.reports.empty': 'Aucun signalement enregistré.',
    'admin.reports.reportedBy': 'signalé par {name}',
    'admin.reports.suspendResolve': 'Suspendre & Résoudre',
    'admin.reports.dismiss': 'Ignorer',
    'admin.reports.resolved': 'Traité',
    'admin.reports.dismissed': 'Classé',
    'admin.plans.title': 'Tarifs Premium (FCFA)',
    'admin.plans.price': 'Prix (FCFA)',
    'admin.plans.popular': 'Mettre en avant (Populaire)',
    'admin.plans.save': 'Enregistrer ce tarif',
    'admin.tx.title': 'Transactions récentes',
    'admin.tx.empty': 'Aucun paiement enregistré.',
    'admin.audit.title': "Journal d'audit administrateur",
    'admin.audit.empty': "Aucune action d'administration enregistrée pour le moment.",
    'admin.settings.title': "Contenu de la page d'accueil & Paramètres généraux",
    'admin.settings.heroTitle': 'Titre Hero',
    'admin.settings.footerSlogan': 'Slogan Footer',
    'admin.settings.heroSub': 'Texte de présentation Hero',
    'admin.settings.save': 'Enregistrer les paramètres',

    // PWA
    'pwa.install': 'Installer ZOLA',
    'pwa.installIos': 'Installer sur iOS',
    'pwa.iosTitle': 'Installer ZOLA sur iPhone / iPad',
    'pwa.iosStep1': '1. Touchez le bouton Partager dans la barre Safari.',
    'pwa.iosStep2': "2. Faites défiler et sélectionnez Sur l'écran d'accueil.",
    'pwa.offline': 'Mode hors ligne — Données en cache affichées.',
  },
  en: {
    // Common
    'common.back': 'Back',
    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.send': 'Send',
    'common.loading': 'Loading...',
    'common.online': 'Online',
    'common.offline': 'Offline',
    'common.verified': 'Verified profile',
    'common.years': 'yrs',
    'common.langLabel': 'Language',
    'common.switchLangTitle': 'Switch to French',

    // Legal & Match modal in App
    'legal.title': 'Terms of Use & Privacy Policy',
    'legal.p1':
      'ZOLA is strictly reserved for adults (18+). Profile information and private conversations are protected, accessible only to authorized participants, and never sold to third parties.',
    'legal.p2':
      'Any fraudulent behavior, impersonation, or harassment can be reported and results in immediate account suspension by our moderation team.',
    'match.itsAMatch': "It's a",
    'match.matchWord': 'Match!',
    'match.mutualWith': 'You and {name} liked each other!',
    'match.sendMessage': 'Send a message',
    'match.keepDiscovering': 'Keep discovering',

    // Nav & AppShell
    'nav.discover': 'Discover',
    'nav.favorites': 'Favorites',
    'nav.messages': 'Messages',
    'nav.notifications': 'Notifications',
    'nav.alerts': 'Alerts',
    'nav.profile': 'My profile',
    'nav.profileShort': 'Profile',
    'nav.premium': 'Premium',
    'nav.settings': 'Settings',
    'nav.admin': 'Admin',
    'nav.home': 'Home page',
    'nav.logout': 'Log out',
    'nav.openMenu': 'Open navigation drawer',
    'nav.closeMenu': 'Close menu',
    'nav.mainMenu': 'Main menu',
    'nav.becomePremium': 'Go Premium',
    'nav.premiumActive': 'Premium active',

    // Landing Page
    'landing.nav.home': 'Home',
    'landing.nav.discover': 'Discover',
    'landing.nav.features': 'Features',
    'landing.nav.why': 'Why ZOLA?',
    'landing.nav.steps': 'How it works',
    'landing.nav.pricing': 'Pricing',
    'landing.nav.faq': 'FAQ',
    'landing.nav.mySpace': 'My space',
    'landing.nav.login': 'Sign in',
    'landing.nav.signup': 'Sign up',
    'landing.hero.defaultTitle': 'Find Love in Africa',
    'landing.hero.highlight': 'Africa',
    'landing.hero.defaultSubtitle':
      'Meet authentic singles near you or anywhere across Africa and the diaspora.',
    'landing.hero.ctaPrimary': 'Create an account',
    'landing.hero.ctaSecondary': 'Learn more',
    'landing.hero.activeMember': 'active member',
    'landing.hero.activeMembers': 'active members',
    'landing.hero.verifiedBase': '{count} verified profile(s) in our community',
    'landing.hero.imgAlt': 'Smiling African couple on ZOLA',

    'landing.why.title': 'Why choose ZOLA?',
    'landing.why.subtitle':
      'A platform built for sincere, safe, and authentic connections across the continent.',
    'landing.why.c1.title': 'Verified & safe profiles',
    'landing.why.c1.desc':
      'Strict selfie-challenge verification and instant reporting tools for confident, trustworthy conversations.',
    'landing.why.c2.title': 'Dating across Africa',
    'landing.why.c2.desc':
      'Explore profiles in Ouagadougou, Abidjan, Dakar, Bamako, Douala, or anywhere across the continent.',
    'landing.why.c3.title': 'Fast connection',
    'landing.why.c3.desc':
      'Instant matches and real-time private messaging with voice notes, stickers, and audio/video calls.',
    'landing.why.c4.title': 'Premium features',
    'landing.why.c4.desc':
      'See who liked you, boost your profile visibility, and pay securely in FCFA via SasPay.',

    'landing.bento.title': 'Tools designed for genuine conversations',
    'landing.bento.subtitle':
      'Discover, save favorites, and chat with modern features crafted for the African continent.',
    'landing.bento.b1.tag': 'Discovery · Favorites · Compatibility',
    'landing.bento.b1.title': 'Precise African filters & dedicated Favorites list',
    'landing.bento.b1.desc':
      'Search profiles in Abidjan, Dakar, Ouagadougou, Bamako, Douala, or the diaspora by shared interests. Save standout profiles to your Favorites to revisit anytime.',
    'landing.bento.b1.f1': 'Country & city filters',
    'landing.bento.b1.f2': 'Real affinity score',
    'landing.bento.b1.f3': 'Priority Super Like',
    'landing.bento.b2.tag': 'Audio · Video · Voice',
    'landing.bento.b2.title': 'Audio/video calls & voice notes',
    'landing.bento.b2.desc':
      'Hear your Match’s voice before your first date using voice notes and live encrypted WebRTC calls.',
    'landing.bento.b3.tag': 'Culture · Expression',
    'landing.bento.b3.title': 'African cultural stickers & reactions',
    'landing.bento.b3.desc':
      'Break the ice with illustrated cultural stickers (Akwaaba, Kente Heart, Royal Mask, Djembe Drum, Sahel Sun) and instant message reactions.',
    'landing.bento.b4.tag': 'Selfie check · Blocking · 2FA',
    'landing.bento.b4.title': 'Enhanced safety, selfie verification & one-tap blocking',
    'landing.bento.b4.desc':
      'EXIF/GPS metadata is stripped automatically from uploaded photos. Stay in full control with selfie challenge verification, two-factor authentication (2FA), reporting, and instant profile blocking.',
    'landing.bento.b4.f1': 'EXIF/GPS stripping',
    'landing.bento.b4.f2': 'Active moderation',
    'landing.bento.b4.f3': 'Instant blocking',

    'landing.steps.title': 'Genuine connections in three simple steps',
    'landing.steps.subtitle':
      'A clear journey with no opaque algorithms, focused on shared values and safety.',
    'landing.steps.s1.title': '01. Create your verified profile',
    'landing.steps.s1.desc':
      'Add your city and interests, and verify your identity with a selfie challenge to inspire trust from the first glance.',
    'landing.steps.s2.title': '02. Explore by affinity & Favorites',
    'landing.steps.s2.desc':
      'Filter by country, city, and interests, bookmark profiles you want to revisit in Favorites, and send a Like or Super Like.',
    'landing.steps.s3.title': '03. Match, call & connect',
    'landing.steps.s3.desc':
      'Once interest is mutual, chat privately with voice notes, African cultural stickers, and encrypted audio or video calls.',

    'landing.stats.activeMembers': 'Registered active members',
    'landing.stats.verifiedProfiles': 'Selfie-verified profiles',
    'landing.stats.mutualMatches': 'Mutual matches created',
    'landing.stats.countries': 'Countries represented online',

    'landing.quick.title': 'Set up your profile in seconds',
    'landing.quick.subtitle':
      'Choose your starting preferences to jump straight to compatible singles.',
    'landing.quick.iAm': 'I am a',
    'landing.quick.seeking': 'Seeking',
    'landing.quick.country': 'Country',
    'landing.quick.start': 'Get started',
    'landing.recent.title': 'Recently active members',
    'landing.recent.seeMore': 'See more',
    'landing.recent.verified': 'Verified profile',

    'landing.testimonials.title': 'Member stories across Africa',
    'landing.testimonials.subtitle':
      'Real connections born from authentic profiles and respectful conversations.',
    'landing.testimonials.t1.quote':
      'After disappointing experiences on impersonal apps, we clicked on the very first evening thanks to verified badges and built-in audio calls. Six months later, we are planning our engagement.',
    'landing.testimonials.t2.quote':
      'Filtering by city and shared interests changes everything. I met serious people who share my entrepreneurial and family values.',
    'landing.testimonials.t3.quote':
      'Being able to bookmark profiles to Favorites, instantly block inappropriate behavior, and chat using cultural stickers makes the experience warm and reassuring.',

    'landing.pricing.title': 'Go Premium',
    'landing.pricing.subtitle': 'Unlock exclusive perks to multiply your meaningful matches.',
    'landing.pricing.saspayNote':
      'Secured exclusively by SasPay · Orange Money, MTN, Moov, Wave & Bank Cards',
    'landing.pricing.popular': 'Most popular plan',
    'landing.pricing.payWithSaspay': 'Subscribe',

    'landing.faq.title': 'Frequently asked questions',
    'landing.faq.q1': 'How does profile verification work on ZOLA?',
    'landing.faq.a1':
      'Every member can submit a selfie holding a unique challenge code from their profile page. Our moderation team reviews it and grants the verified badge to strengthen community trust.',
    'landing.faq.q2': 'Is ZOLA available across all African countries and the diaspora?',
    'landing.faq.a2':
      'Yes. ZOLA connects singles across West, Central, East, North, and Southern Africa as well as the diaspora, with precise filters by country, city, and interests.',
    'landing.faq.q3': 'How do matching, calls, and privacy work?',
    'landing.faq.a3':
      'Only mutual likes open a private chat. You can send texts, voice notes, and cultural stickers, start WebRTC audio/video calls, and block unwanted profiles at any time.',
    'landing.faq.q4': 'Which payment methods are accepted for ZOLA Premium?',
    'landing.faq.a4':
      'All ZOLA Premium plans (1, 3, or 6 months in FCFA) are processed exclusively via SasPay, supporting Orange Money, MTN Mobile Money, Moov Money, Wave, and Visa/Mastercard with signed server webhook verification.',

    'landing.cta.titlePrefix': 'Join the growing community of',
    'landing.cta.titleHighlight': 'African dating',
    'landing.cta.subtitle':
      'Create your free profile in under two minutes and discover compatible singles near you.',
    'landing.cta.btnAuth': 'Go to Discovery',
    'landing.cta.btnGuest': 'Create my free account',

    'landing.footer.slogan': 'Together, let’s find love',
    'landing.footer.saspay': 'Payments secured by SasPay',
    'landing.footer.nav': 'Navigation',
    'landing.footer.pricing': 'Premium Pricing',
    'landing.footer.legal': 'Legal & Safety',
    'landing.footer.terms': 'Terms of Use',
    'landing.footer.privacy': 'Privacy Policy',
    'landing.footer.safety': 'Safety & Moderation',
    'landing.footer.access': 'Access & Support',
    'landing.footer.manageSub': 'Manage my SasPay subscription',
    'landing.footer.mySpace': 'Open my dashboard',
    'landing.footer.rights': '© 2026 ZOLA. All rights reserved.',

    // Auth Views
    'auth.backHome': 'Back to home',
    'auth.side.register': 'Join an authentic and welcoming community.',
    'auth.side.login': 'Great to see you back on ZOLA.',
    'auth.side.sub': 'Sincere connections across Africa and the diaspora.',
    'auth.login.title': 'Sign in',
    'auth.login.sub': 'Welcome back!',
    'auth.login.emailPlaceholder': 'Your email',
    'auth.login.passwordPlaceholder': 'Password',
    'auth.login.rememberMe': 'Remember me',
    'auth.login.forgot': 'Forgot password?',
    'auth.login.2faPrompt': 'Enter the 6-digit code generated by your authenticator app.',
    'auth.login.2faPlaceholder': '6-digit 2FA code',
    'auth.login.backToCreds': 'Back to credentials',
    'auth.login.submit': 'Sign in',
    'auth.login.submitting': 'Signing in...',
    'auth.login.verify2fa': 'Verify 2FA code',
    'auth.login.oauthSep': 'Or continue with',
    'auth.login.noAccount': "Don't have an account yet?",
    'auth.login.createOne': 'Create an account',
    'auth.login.quickTest': 'Quick demo login:',
    'auth.login.memberDemo': 'Member (Awa)',
    'auth.login.adminDemo': 'Administrator',
    'auth.register.title': 'Create an account',
    'auth.register.sub': 'Join our community and find your soulmate.',
    'auth.register.continueWith': 'Continue with {provider}',
    'auth.register.fullName': 'Full name',
    'auth.register.passwordConfirm': 'Confirm password',
    'auth.register.birthDate': 'Date of birth',
    'auth.register.gender': 'Gender',
    'auth.register.seeking': 'Seeking',
    'auth.register.country': 'Country',
    'auth.register.city': 'City',
    'auth.register.termsPrefix': 'I am at least 18 years old and accept the',
    'auth.register.termsLink': 'Terms of Use',
    'auth.register.termsSuffix': 'and ZOLA Privacy Policy.',
    'auth.register.submit': 'Sign up',
    'auth.register.submitting': 'Creating account...',
    'auth.register.hasAccount': 'Already have an account?',
    'auth.register.mismatch': 'Passwords do not match.',
    'auth.register.mustAccept': 'Please accept the Terms of Use.',
    'auth.forgot.title': 'Forgot password',
    'auth.forgot.sub': 'Securely reset your account access.',
    'auth.forgot.emailPlaceholder': 'Your email address',
    'auth.forgot.sendBtn': 'Send reset token',
    'auth.forgot.sending': 'Sending...',
    'auth.forgot.tokenPlaceholder': 'Token received by email',
    'auth.forgot.newPassPlaceholder': 'New password (min. 8 characters)',
    'auth.forgot.confirmBtn': 'Confirm new password',
    'auth.forgot.updating': 'Updating...',
    'auth.forgot.backToLogin': 'Back to sign in',

    // Discover View
    'discover.title': 'Discover',
    'discover.countSingular': '{count} profile matching your criteria.',
    'discover.countPlural': '{count} profiles matching your criteria.',
    'discover.tab.profiles': 'Profiles',
    'discover.tab.likesMe': 'Liked you ({count})',
    'discover.reviewPassed': 'Review ({count})',
    'discover.reviewPassedTitle': 'Review skipped profiles',
    'discover.boost': 'Boost my profile',
    'discover.goPremium': 'Go Premium',
    'discover.searchPlaceholder': 'Search by name, city, profession...',
    'discover.sort.compatibility': 'Sort: Best match',
    'discover.sort.recent': 'Sort: Recently active',
    'discover.gender.all': 'All genders',
    'discover.gender.women': 'Women',
    'discover.gender.men': 'Men',
    'discover.filters': 'Filters',
    'discover.filter.country': 'Country',
    'discover.filter.allCountries': 'All countries',
    'discover.filter.city': 'City',
    'discover.filter.cityPlaceholder': 'e.g. Dakar, Abidjan...',
    'discover.filter.age': 'Age ({min} - {max} yrs)',
    'discover.filter.interest': 'Interest',
    'discover.filter.allInterests': 'All',
    'discover.filter.verifiedOnly': 'Verified only',
    'discover.empty.title': 'No profiles found',
    'discover.empty.desc':
      'Adjust your filters or reset skipped profiles to discover more members.',
    'discover.empty.resetFilters': 'Reset filters',
    'discover.empty.reviewPassed': 'Review skipped profiles',
    'discover.swipeHint': 'Swipe a card right to like or left to skip',
    'discover.loadMore': 'Load more profiles',
    'discover.stamp.like': 'LIKE',
    'discover.stamp.pass': 'PASS',
    'discover.boosted': 'Boosted',
    'discover.affinity': '{score}% match',
    'discover.favAdd': 'Save to favorites',
    'discover.favRemove': 'Remove from favorites',
    'discover.pass': 'Pass',
    'discover.superLike': 'Super Like',
    'discover.likesMe.lockedTitle': '{count} people liked your profile',
    'discover.likesMe.lockedTitleOne': '1 person liked your profile',
    'discover.likesMe.lockedDesc':
      'Upgrade to ZOLA Premium to immediately see who likes you and start matching without waiting.',
    'discover.likesMe.unlockBtn': 'See with ZOLA Premium',
    'discover.likesMe.empty': 'Nobody has liked your profile yet.',

    // Favorites View
    'fav.title': 'My Favorites',
    'fav.savedSingular': '{count} profile saved for later.',
    'fav.savedPlural': '{count} profiles saved for later.',
    'fav.browseDiscover': 'Discover more profiles',
    'fav.searchPlaceholder': 'Filter favorites by name, city, or country...',
    'fav.empty.title': 'No saved favorites yet',
    'fav.empty.desc':
      'Save profiles that catch your eye from Discover or any member page to quickly revisit them here.',
    'fav.empty.cta': 'Explore profiles',
    'fav.noMatch': 'No favorites match "{query}".',
    'fav.removedMsg': '{name} has been removed from your favorites.',
    'fav.likedMsg': 'Like sent to {name}.',
    'fav.sendMessage': 'Send a message',
    'fav.alreadyLiked': 'Already liked',
    'fav.sendLike': 'Send a Like',

    // Member Profile View
    'member.notFound': 'This profile could not be found or is unavailable.',
    'member.sign': 'Sign: {sign}',
    'member.aboutMe': 'About me',
    'member.noBio': 'This member has not written a bio yet.',
    'member.interests': 'Interests',
    'member.editOwn': 'Edit my profile',
    'member.sendMessage': 'Send a message',
    'member.like': 'Like',
    'member.liked': 'Liked',
    'member.superLike': 'Super Like',
    'member.superLikeTitle': 'Priority Super Like',
    'member.inFavorites': 'Saved in favorites',
    'member.saveFavorite': 'Save to favorites',
    'member.report': 'Report',
    'member.block': 'Block profile',
    'member.superLikeSent': 'Priority Super Like sent to {name}!',
    'member.likeSent': 'You sent a Like to {name}.',
    'member.matchFirstHint':
      'Like this profile first: as soon as they like you back, private messaging opens!',
    'member.reportModalTitle': 'Report {name}',
    'member.reportReason': 'Reason',
    'member.reportDetails': 'Details',
    'member.reportPlaceholder': 'Briefly describe the situation...',
    'member.reportSubmit': 'Submit report',
    'member.blockModalTitle': 'Block {name}?',
    'member.blockModalSub': 'Immediate & safe action',
    'member.blockModalDesc':
      '{name} will no longer be able to view your profile or message you. Any active match and conversation with this user will be removed immediately.',
    'member.blocking': 'Blocking...',
    'member.blockConfirm': 'Confirm block',

    // Messages View
    'msg.title': 'Messages',
    'msg.discussions': '{count} chat(s)',
    'msg.searchPlaceholder': 'Search a conversation...',
    'msg.noMatches': 'No matches yet. Like profiles in Discover to start chatting!',
    'msg.voiceNote': 'Voice note',
    'msg.photoSent': 'Photo sent',
    'msg.newMatchHello': 'New Match! Say hello',
    'msg.selectConv': 'Select a conversation',
    'msg.selectConvSub': 'Your private chats are only accessible to matched participants.',
    'msg.typing': 'typing...',
    'msg.audioCall': 'Audio call',
    'msg.videoCall': 'Video call',
    'msg.viewProfile': 'View profile',
    'msg.reportMember': 'Report member',
    'msg.blockMember': 'Block member',
    'msg.icebreakerTitle': 'Break the ice with {name}',
    'msg.ice1': 'Hey! Love your profile — what is your favorite spot in your city?',
    'msg.ice2': 'Morning coffee person or sunset walk person?',
    'msg.ice3': 'Which song or artist have you had on repeat lately?',
    'msg.react': 'React',
    'msg.stickersTitle': 'African cultural stickers',
    'msg.imageReady': 'Image ready: {name}',
    'msg.remove': 'Remove',
    'msg.sendPhotoTitle': 'Send a photo',
    'msg.stickersBtnTitle': 'Cultural stickers',
    'msg.emojisBtnTitle': 'Emojis',
    'msg.voiceBtnTitle': 'Voice note',
    'msg.recording': 'Recording voice... {seconds}s',
    'msg.inputPlaceholder': 'Write a message...',
    'msg.call.callingVideo': 'Video calling...',
    'msg.call.callingAudio': 'Audio calling...',
    'msg.call.incomingVideo': 'Incoming video call',
    'msg.call.incomingAudio': 'Incoming audio call',
    'msg.call.connected': 'Call connected',
    'msg.call.answer': 'Answer',
    'msg.call.decline': 'Decline',
    'msg.reportSent': 'Report sent to our moderation team.',
    'msg.micDenied': 'Microphone unavailable. Check your browser permissions.',
    'msg.mediaDenied': 'Could not access microphone or camera to start the call.',
    'msg.permDenied': 'Microphone/camera permission denied.',

    // Premium View
    'premium.title': 'Go Premium',
    'premium.sub': 'Enjoy exclusive perks',
    'premium.popular': 'Popular',
    'premium.gatewayTitle': 'Unified Gateway · SasPay',
    'premium.gatewayDesc': 'Orange Money, MTN, Moov, Wave & Visa / Mastercard',
    'premium.payBtn': 'Subscribe',
    'premium.initializing': 'Initializing SasPay...',
    'premium.signedFooter': 'All payments are processed and signed via SasPay (`docs.saspay.me`)',
    'premium.statusTitle': 'Subscription status',
    'premium.plan': 'Plan',
    'premium.status': 'Status',
    'premium.active': 'Active',
    'premium.startDate': 'Started',
    'premium.expiryDate': 'Expires',
    'premium.freeDesc':
      'You are currently on the free plan. Choose a tier above to activate ZOLA Premium via SasPay.',
    'premium.historyTitle': 'Payment history',
    'premium.noTx': 'No transactions recorded yet.',
    'premium.col.ref': 'Reference',
    'premium.col.plan': 'Plan',
    'premium.col.amount': 'Amount',
    'premium.col.status': 'Status',
    'premium.col.receipt': 'Receipt',
    'premium.tx.completed': 'Confirmed',
    'premium.tx.pending': 'Pending',
    'premium.tx.failed': 'Failed',
    'premium.checkoutTitle': 'SasPay Checkout',
    'premium.sessionSaspay': 'SasPay Session',
    'premium.totalToPay': 'Total due',
    'premium.hostedHint':
      'Your hosted SasPay session is ready. Complete payment on the secure SasPay page, then click "Verify my payment".',
    'premium.sandboxHint':
      'Local sandbox mode active (`SASPAY_SECRET_KEY` not configured). Validation cryptographically verifies the SasPay transaction on the server (`/api/premium/verify` & webhook `/api/premium/webhook/saspay`).',
    'premium.openSaspay': 'Open SasPay',
    'premium.verifying': 'Verifying...',
    'premium.verifyBtn': 'Verify my payment',
    'premium.validateSandboxBtn': 'Validate SasPay payment',
    'premium.verifiedSuccess': 'SasPay payment verified and ZOLA Premium activated!',
    'premium.receiptTitle': 'ZOLA Payment Receipt',
    'premium.paid': 'Paid',
    'premium.member': 'Member',
    'premium.gateway': 'Gateway',
    'premium.validatedAt': 'Validated at',
    'premium.amountPaid': 'Amount paid',
    'premium.print': 'Print',

    // Edit Profile, Settings, Notifications
    'edit.title': 'Edit my profile',
    'edit.viewProfile': 'View my profile',
    'edit.changeAvatar': 'Change main photo',
    'edit.gallery': 'Photo gallery',
    'edit.addPhoto': 'Add',
    'edit.verifTitle': 'Identity verification',
    'edit.verifDone': 'Verified',
    'edit.verifPending': 'Pending',
    'edit.verifActiveDesc': 'Your verified profile badge is active.',
    'edit.verifCodeHint': 'Upload a selfie holding the code',
    'edit.verifCodeSuffix': 'to earn the verified badge.',
    'edit.verifRejected': 'Previous rejection: {note}',
    'edit.verifSending': 'Review in progress...',
    'edit.verifBtn': 'Submit my selfie',
    'edit.fullName': 'Full name',
    'edit.birthDate': 'Date of birth',
    'edit.gender': 'Gender',
    'edit.seeking': 'Seeking gender',
    'edit.country': 'Country',
    'edit.city': 'City',
    'edit.profession': 'Profession',
    'edit.professionPlaceholder': 'e.g. Architect',
    'edit.height': 'Height (cm)',
    'edit.zodiac': 'Zodiac sign',
    'edit.zodiacUnspecified': 'Not specified',
    'edit.interests': 'Interests',
    'edit.aboutMe': 'About me',
    'edit.aboutPlaceholder': 'Tell us about yourself, your passions, and who you are looking for...',
    'edit.saving': 'Saving...',
    'edit.saveBtn': 'Save changes',
    'edit.savedOk': 'Profile saved successfully.',
    'edit.avatarUpdated': 'Main profile photo updated.',
    'edit.photoAdded': 'Photo added to your gallery.',

    'settings.title': 'Settings',
    'settings.nav.profile': 'My profile',
    'settings.nav.notifications': 'Notifications',
    'settings.nav.privacy': 'Privacy',
    'settings.nav.prefs': 'Preferences & Security',
    'settings.nav.help': 'Help & Support',
    'settings.nav.about': 'About',
    'settings.nav.logout': 'Log out',
    'settings.saved': 'Settings saved.',
    'settings.notifMatchTitle': 'Match notifications',
    'settings.notifMatchDesc': 'Receive an alert when you get a new Match or Like.',
    'settings.notifMsgTitle': 'New message notifications',
    'settings.notifMsgDesc': 'Get notified whenever a match sends you a message.',
    'settings.visibilityTitle': 'My profile is visible to everyone',
    'settings.visibilityDesc': 'Turn this off to temporarily hide your profile from Discover.',
    'settings.langCardTitle': 'Interface language',
    'settings.langCardDesc': 'Choose your preferred language across the ZOLA platform.',
    'settings.passTitle': 'Change password',
    'settings.passCurrent': 'Current password',
    'settings.passNew': 'New password (min. 8 characters)',
    'settings.passUpdate': 'Update password',
    'settings.2faTitle': 'Two-factor authentication (2FA TOTP)',
    'settings.2faOn': 'Enabled',
    'settings.2faOff': 'Disabled',
    'settings.2faDisableDesc':
      'Your account is protected by TOTP. Enter a current code from your authenticator app to disable 2FA.',
    'settings.2faCodePlaceholder': '6-digit code',
    'settings.2faDisableBtn': 'Disable 2FA',
    'settings.2faSetupHint':
      'Add this secret key in Google Authenticator, Authy, or 1Password:',
    'settings.2faVerifyPlaceholder': 'Verification code (6 digits)',
    'settings.2faEnableBtn': 'Enable 2FA',
    'settings.2faPromo':
      'Add a second layer of security with a 6-digit TOTP code at every login.',
    'settings.2faSetupBtn': 'Set up 2FA',
    'settings.2faEnabledMsg': 'Two-factor authentication (2FA) enabled.',
    'settings.2faDisabledMsg': 'Two-factor authentication (2FA) disabled.',
    'settings.sessionsTitle': 'Active sessions ({count})',
    'settings.sessionsEmpty': 'No other active sessions found.',
    'settings.sessionsCurrent': 'Current session',
    'settings.sessionsRevoke': 'Revoke',
    'settings.sessionsRevokedMsg': 'Session revoked.',
    'settings.sessionsActivity': 'IP: {ip} · Activity: {date}',
    'settings.deleteTitle': 'Permanently delete my account',
    'settings.deleteDesc':
      'This action permanently deletes your profile, matches, and conversations from the database.',
    'settings.deletePlaceholder': 'Confirm with your password',
    'settings.deleteBtn': 'Delete account',
    'settings.helpTitle': 'ZOLA Help & Support',
    'settings.helpP1':
      'For any questions regarding safety, Mobile Money payments, or profile verification, reach our team at support@zola.africa.',
    'settings.helpP2':
      'Tip: you can report or block inappropriate behavior directly from any member profile or chat.',
    'settings.aboutTitle': 'About ZOLA',
    'settings.aboutP1':
      'ZOLA ("Together, let’s find love") is dedicated to authentic African dating, connecting hearts across Africa’s major cities and its global diaspora.',

    'notif.title': 'Notifications',
    'notif.markAllRead': 'Mark all as read',
    'notif.empty': 'No notifications yet.',

    // Admin Dashboard & Charts
    'admin.title': 'ZOLA Administration',
    'admin.activeRole': 'Active role:',
    'admin.tab.overview': 'Overview',
    'admin.tab.users': 'Users ({count})',
    'admin.tab.verifs': 'Verifications ({count})',
    'admin.tab.reports': 'Reports ({count})',
    'admin.tab.payments': 'Payments & Plans',
    'admin.tab.audit': 'Audit log',
    'admin.tab.settings': 'Content Management',
    'admin.kpi.users': 'Registered members',
    'admin.kpi.usersSub': '{verified} verified · {online} online',
    'admin.kpi.matches': 'Matches & Messages',
    'admin.kpi.messagesSub': '{count} messages exchanged',
    'admin.kpi.revenue': 'Premium Revenue',
    'admin.kpi.revenueSub': '{active} active · Conversion: {rate}%',
    'admin.kpi.moderation': 'Pending moderation',
    'admin.kpi.moderationSub': '{reports} report(s) · {verifs} verification(s)',
    'admin.csv.title': 'Accounting & moderation exports (CSV)',
    'admin.csv.desc':
      'Download UTF-8 formatted raw data for Excel or your accounting reports.',
    'admin.csv.users': 'Export Users',
    'admin.csv.payments': 'Export Payments',
    'admin.csv.reports': 'Export Reports',
    'admin.chart.signupsTitle': 'Monthly signups trend',
    'admin.chart.signupsSub': '{total} signup(s) recorded over the last {months} months',
    'admin.chart.months6': '6 months',
    'admin.chart.months12': '12 months',
    'admin.chart.revenueTitle': 'Monthly Premium revenue (FCFA)',
    'admin.chart.revenueSub': '{total} FCFA in selected period',
    'admin.chart.countryTitle': 'Geographic distribution by country',
    'admin.chart.countrySub': 'Top active countries in the ZOLA community',
    'admin.users.search': 'Filter by name, email, city...',
    'admin.users.prev': 'Previous',
    'admin.users.next': 'Next',
    'admin.users.col.member': 'Member',
    'admin.users.col.location': 'Location',
    'admin.users.col.role': 'Role',
    'admin.users.col.status': 'Status',
    'admin.users.col.actions': 'Actions',
    'admin.users.active': 'Active',
    'admin.users.suspended': 'Suspended',
    'admin.users.unverify': 'Unverify',
    'admin.users.verify': 'Verify',
    'admin.users.suspend': 'Suspend',
    'admin.users.reactivate': 'Reactivate',
    'admin.verifs.title': 'Identity verification requests',
    'admin.verifs.empty': 'No verification requests submitted.',
    'admin.verifs.approve': 'Approve',
    'admin.verifs.reject': 'Reject',
    'admin.verifs.approved': 'Approved',
    'admin.verifs.rejected': 'Rejected',
    'admin.reports.empty': 'No reports recorded.',
    'admin.reports.reportedBy': 'reported by {name}',
    'admin.reports.suspendResolve': 'Suspend & Resolve',
    'admin.reports.dismiss': 'Dismiss',
    'admin.reports.resolved': 'Resolved',
    'admin.reports.dismissed': 'Dismissed',
    'admin.plans.title': 'Premium Plans (FCFA)',
    'admin.plans.price': 'Price (FCFA)',
    'admin.plans.popular': 'Highlight (Popular)',
    'admin.plans.save': 'Save plan',
    'admin.tx.title': 'Recent transactions',
    'admin.tx.empty': 'No payments recorded.',
    'admin.audit.title': 'Administrator audit log',
    'admin.audit.empty': 'No admin actions recorded yet.',
    'admin.settings.title': 'Landing page content & General settings',
    'admin.settings.heroTitle': 'Hero Title',
    'admin.settings.footerSlogan': 'Footer Slogan',
    'admin.settings.heroSub': 'Hero Subtitle',
    'admin.settings.save': 'Save settings',

    // PWA
    'pwa.install': 'Install ZOLA',
    'pwa.installIos': 'Install on iOS',
    'pwa.iosTitle': 'Install ZOLA on iPhone / iPad',
    'pwa.iosStep1': '1. Tap the Share button in the Safari bar.',
    'pwa.iosStep2': '2. Scroll down and select Add to Home Screen.',
    'pwa.offline': 'Offline mode — Showing cached data.',
  },
} as const;

export type TranslationKey = keyof typeof translations.fr;

interface I18nContextValue {
  lang: Language;
  locale: string;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  cmsSettings: SiteSettings;
  setCmsSettings: (settings: SiteSettings) => void;
  brandName: string;
  countries: CountryItem[];
  zodiacSigns: BilingualItem[];
  reportReasons: BilingualItem[];
  icebreakers: BilingualItem[];
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  tCountry: (country: string) => string;
  tGender: (gender: string) => string;
  tZodiac: (sign: string) => string;
  tInterest: (name: string) => string;
  tPlanName: (name: string) => string;
  tPlanFeature: (feature: string) => string;
  tReportReason: (reason: string) => string;
  tStickerOrigin: (origin: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'fr' || saved === 'en') return saved;
    if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')) {
      return 'en';
    }
  } catch {
    // Ignore storage errors
  }
  return 'fr';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(detectInitialLanguage);
  const [cmsSettings, setCmsSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'fr' ? 'en' : 'fr');
  }, [lang, setLang]);

  const brandName = (cmsSettings.brand_name || 'ZOLA').trim() || 'ZOLA';

  const overridesFr = useMemo(
    () => parseCmsJson<Record<string, string>>(cmsSettings.i18n_overrides_fr, {}),
    [cmsSettings.i18n_overrides_fr]
  );
  const overridesEn = useMemo(
    () => parseCmsJson<Record<string, string>>(cmsSettings.i18n_overrides_en, {}),
    [cmsSettings.i18n_overrides_en]
  );

  const countries = useMemo(
    () => parseCmsJson<CountryItem[]>(cmsSettings.countries_json, DEFAULT_COUNTRIES),
    [cmsSettings.countries_json]
  );
  const zodiacSigns = useMemo(
    () => parseCmsJson<BilingualItem[]>(cmsSettings.zodiac_signs_json, DEFAULT_ZODIAC_ITEMS),
    [cmsSettings.zodiac_signs_json]
  );
  const reportReasons = useMemo(
    () => parseCmsJson<BilingualItem[]>(cmsSettings.report_reasons_json, DEFAULT_REPORT_REASONS),
    [cmsSettings.report_reasons_json]
  );
  const icebreakers = useMemo(
    () => parseCmsJson<BilingualItem[]>(cmsSettings.chat_icebreakers_json, DEFAULT_CHAT_ICEBREAKERS),
    [cmsSettings.chat_icebreakers_json]
  );

  useEffect(() => {
    document.documentElement.lang = lang;
    const customTitle =
      lang === 'en'
        ? cmsSettings.site_title_en || `${brandName} — Find Love in Africa`
        : cmsSettings.site_title_fr || `${brandName} — Trouvez l'amour en Afrique`;
    document.title = customTitle;
  }, [lang, brandName, cmsSettings.site_title_en, cmsSettings.site_title_fr]);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      const overrideMap = lang === 'en' ? overridesEn : overridesFr;
      const hasOverride = Boolean(overrideMap[key] && overrideMap[key].trim() !== '');
      let text: string =
        (hasOverride ? overrideMap[key] : undefined) ??
        translations[lang][key] ??
        translations.fr[key] ??
        key;
      if (!hasOverride && brandName !== 'ZOLA') {
        text = text.replace(/\bZOLA\b/g, brandName);
      }
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return text;
    },
    [lang, overridesEn, overridesFr, brandName]
  );

  const tCountry = useCallback(
    (country: string) => {
      const found = countries.find((c) => c.name === country);
      if (found) return lang === 'en' ? found.en || found.name : found.name;
      return lang === 'en' ? COUNTRY_EN[country] || country : country;
    },
    [lang, countries]
  );
  const tGender = useCallback(
    (gender: string) => (lang === 'en' ? GENDER_EN[gender] || gender : gender),
    [lang]
  );
  const tZodiac = useCallback(
    (sign: string) => {
      const found = zodiacSigns.find((z) => z.fr === sign);
      if (found) return lang === 'en' ? found.en || found.fr : found.fr;
      return lang === 'en' ? ZODIAC_EN[sign] || sign : sign;
    },
    [lang, zodiacSigns]
  );
  const tInterest = useCallback(
    (name: string) => (lang === 'en' ? INTEREST_EN[name] || name : name),
    [lang]
  );
  const tPlanName = useCallback(
    (name: string) => (lang === 'en' ? PLAN_NAME_EN[name] || name : name),
    [lang]
  );
  const tPlanFeature = useCallback(
    (feature: string) => (lang === 'en' ? PLAN_FEATURE_EN[feature] || feature : feature),
    [lang]
  );
  const tReportReason = useCallback(
    (reason: string) => {
      const found = reportReasons.find((r) => r.fr === reason);
      if (found) return lang === 'en' ? found.en || found.fr : found.fr;
      return lang === 'en' ? REPORT_REASON_EN[reason] || reason : reason;
    },
    [lang, reportReasons]
  );
  const tStickerOrigin = useCallback(
    (origin: string) => (lang === 'en' ? STICKER_ORIGIN_EN[origin] || origin : origin),
    [lang]
  );

  return (
    <I18nContext.Provider
      value={{
        lang,
        locale: lang === 'en' ? 'en-US' : 'fr-FR',
        setLang,
        toggleLang,
        cmsSettings,
        setCmsSettings,
        brandName,
        countries,
        zodiacSigns,
        reportReasons,
        icebreakers,
        t,
        tCountry,
        tGender,
        tZodiac,
        tInterest,
        tPlanName,
        tPlanFeature,
        tReportReason,
        tStickerOrigin,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
