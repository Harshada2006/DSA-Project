import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    // Brand & General
    app_name: 'EcoNexus Nashik',
    tagline: 'Smart Waste Management & Municipal Operations',
    civic_portal: 'Civic Waste Portal',
    swachh_nashik: 'Swachh Nashik',
    system_status: 'System Status: Operational',
    engine_active: 'Engine: Active',
    language: 'Language',
    theme: 'Theme',
    light_mode: 'Light Mode',
    dark_mode: 'Dark Mode',
    sign_out: 'Sign Out',
    sign_in: 'Sign In',
    back_to_home: 'Back to EcoNexus',
    loading: 'Loading...',
    refresh: 'Refresh',

    // Landing Page
    landing_badge: 'Nashik Municipal Corporation (NMC) Civic Technology',
    landing_title: 'Smart Waste Management for a Cleaner, Greener Nashik',
    landing_subtitle: 'Empowering Nashik citizens, municipal field workers, and sanitation administrators with transparent waste tracking, e-waste recycling, and clean neighborhoods.',
    portal_citizen_title: 'Citizen Portal',
    portal_citizen_desc: 'Report overflowing bins, request doorstep e-waste pickups, and track complaint resolutions in your ward.',
    portal_citizen_btn: 'Citizen Access',
    portal_worker_title: 'Field Worker Portal',
    portal_worker_desc: 'View daily collection schedules, suggested optimized routes, scan bin assets, and report field issues.',
    portal_worker_btn: 'Worker Sign In',
    portal_org_title: 'Municipal Administration',
    portal_org_desc: 'Audit bin fill levels, manage collection teams, process e-waste stewardship, and view citywide analytics.',
    portal_org_btn: 'Admin Sign In',
    explore_facilities: 'Explore Certified Facilities',
    key_metrics_title: 'Civic Impact in Numbers',
    monitored_bins: 'Monitored Bins',
    daily_clearance: 'Daily Waste Cleared',
    verified_centers: 'Verified E-Waste Hubs',
    municipal_divisions: 'Municipal Divisions',

    // Navigation & Sidebar
    nav_overview: 'Overview',
    nav_bins: 'Bin Management',
    nav_map: 'Geospatial Live Map',
    nav_priority: 'Collection Priority',
    nav_tasks: 'Collection Tasks',
    nav_workers: 'Worker Team',
    nav_complaints: 'Citizen Complaints',
    nav_ewaste: 'E-Waste Stewardship',
    nav_facilities: 'Verified Facilities',
    nav_analytics: 'Analytics & Reports',

    // Citizen Dashboard
    tab_report_waste: 'Report Waste Issue',
    tab_my_complaints: 'My Complaints',
    tab_ewaste_pickup: 'Request E-Waste Pickup',
    tab_my_ewaste: 'My E-Waste Requests',
    tab_facilities: 'Public Collection Centers',
    complaint_title: 'Issue Title',
    complaint_category: 'Category',
    complaint_ward: 'Ward / Area',
    complaint_landmark: 'Landmark / Address',
    complaint_desc: 'Description (Optional)',
    submit_complaint: 'Submit Complaint',
    ewaste_category: 'E-Waste Category',
    ewaste_count: 'Approx. Item Count',
    ewaste_address: 'Doorstep Pickup Address',
    ewaste_date: 'Preferred Date',
    submit_ewaste: 'Schedule Doorstep Pickup',

    // Worker Dashboard
    worker_shift: 'Active Shift',
    worker_tour: 'Daily Waste Collection Tour',
    tab_assigned_tasks: 'Assigned Tasks',
    tab_suggested_route: 'Suggested Route',
    tab_record_collection: 'Collect Waste',
    tab_report_issue: 'Report Issue',
    tab_scan_asset: 'Asset Scanner',
    tab_ewaste_handover: 'E-Waste Handover',
    start_task: 'Start Collection',
    confirm_collection: 'Confirm Collection',
    status_pending: 'Pending',
    status_in_progress: 'In Progress',
    status_completed: 'Completed',
    status_submitted: 'Submitted',
    status_assigned: 'Assigned',
    status_collected: 'Collected',
    status_delivered: 'Delivered to Recycler',

    // Bins & Priority
    critical_bins: 'High-Risk Bins',
    fill_level: 'Fill Level',
    expected_fill: 'Expected Fill Level Tomorrow',
    predicted_overflow: 'Predicted Overflow Risk',
    statistical_estimate: 'Statistical Prediction (Non-Sensor)',
  },

  mr: {
    // Brand & General
    app_name: 'इकोनेक्सस नाशिक',
    tagline: 'स्मार्ट कचरा व्यवस्थापन व नाशिक महानगरपालिका ऑपरेशन्स',
    civic_portal: 'नागरी कचरा व्यवस्थापन पोर्टल',
    swachh_nashik: 'स्वच्छ नाशिक',
    system_status: 'प्रणाली स्थिती: कार्यरत',
    engine_active: 'इंजिन: सक्रिय',
    language: 'भाषा',
    theme: 'थीम',
    light_mode: 'लाईट मोड',
    dark_mode: 'डार्क मोड',
    sign_out: 'बाहेर पडा (Sign Out)',
    sign_in: 'लॉगिन करा (Sign In)',
    back_to_home: 'मुख्य पानावर परत जा',
    loading: 'लोड होत आहे...',
    refresh: 'रिफ्रेश करा',

    // Landing Page
    landing_badge: 'नाशिक महानगरपालिका (NMC) नागरी तंत्रज्ञान उपक्रम',
    landing_title: 'स्वच्छ व सुंदर नाशिकसाठी स्मार्ट कचरा व्यवस्थापन',
    landing_subtitle: 'नाशिकचे नागरिक, स्वच्छता कर्मचारी आणि महापालिका प्रशासनासाठी पारदर्शक कचरा ट्रॅकिंग, ई-कचरा संकलन आणि स्वच्छ परिसर.',
    portal_citizen_title: 'नागरिक सेवा पोर्टल',
    portal_citizen_desc: 'कचराकुंडी भरल्याची तक्रार नोंदवा, दारात ई-कचरा उचलण्याची विनंती करा आणि तक्रारीची स्थिती ट्रॅक करा.',
    portal_citizen_btn: 'नागरिक प्रवेश',
    portal_worker_title: 'स्वच्छता कर्मचारी पोर्टल',
    portal_worker_desc: 'दैनंदिन संकलन कामे, सुचवलेला संकलन मार्ग, क्यूआर कोड स्कॅनिंग आणि रस्त्यावरील अडचणी नोंदवा.',
    portal_worker_btn: 'कर्मचारी लॉगिन',
    portal_org_title: 'महानगरपालिका प्रशासन',
    portal_org_desc: 'कचराकुंडी पातळी निरीक्षण, कर्मचारी वाटप, ई-कचरा पुनर्चक्रीकरण आणि शहरव्यापी अहवाल पहा.',
    portal_org_btn: 'प्रशासक लॉगिन',
    explore_facilities: 'प्रमाणित केंद्रे पहा',
    key_metrics_title: 'नागरी परिणाम आकडेवारीत',
    monitored_bins: 'नोंदणीकृत कुंड्या',
    daily_clearance: 'दररोज उचललेला कचरा',
    verified_centers: 'प्रमाणित ई-कचरा केंद्रे',
    municipal_divisions: 'प्रशासकीय प्रभाग',

    // Navigation & Sidebar
    nav_overview: 'एकूण आढावा',
    nav_bins: 'कचराकुंडी व्यवस्थापन',
    nav_map: 'थेट नकाशा (Live Map)',
    nav_priority: 'संकलन प्राधान्य',
    nav_tasks: 'संकलन कार्ये',
    nav_workers: 'स्वच्छता पथक',
    nav_complaints: 'नागरिक तक्रारी',
    nav_ewaste: 'ई-कचरा व्यवस्थापन',
    nav_facilities: 'प्रमाणित केंद्रे',
    nav_analytics: 'विश्लेषण व अहवाल',

    // Citizen Dashboard
    tab_report_waste: 'कचरा समस्या तक्रार',
    tab_my_complaints: 'माझ्या तक्रारी',
    tab_ewaste_pickup: 'ई-कचरा संकलन विनंती',
    tab_my_ewaste: 'माझ्या ई-कचरा विनंत्या',
    tab_facilities: 'सार्वजनिक संकलन केंद्रे',
    complaint_title: 'तक्रारीचे शीर्षक',
    complaint_category: 'प्रकार',
    complaint_ward: 'प्रभाग / परिसर',
    complaint_landmark: 'पत्ता / मुख्य खूण',
    complaint_desc: 'तपशील (ऐच्छिक)',
    submit_complaint: 'तक्रार नोंदवा',
    ewaste_category: 'ई-कचरा प्रकार',
    ewaste_count: 'अंदाजे वस्तूंची संख्या',
    ewaste_address: 'दारोदारी संकलनाचा पत्ता',
    ewaste_date: 'पसंतीची तारीख',
    submit_ewaste: 'संकलन वेळ निश्चित करा',

    // Worker Dashboard
    worker_shift: 'सक्रिय पाळी (Shift)',
    worker_tour: 'दैनंदिन कचरा संकलन दौरा',
    tab_assigned_tasks: 'नेमून दिलेली कामे',
    tab_suggested_route: 'सुचवलेला संकलन मार्ग',
    tab_record_collection: 'कचरा संकलन नोंदवा',
    tab_report_issue: 'अडचण नोंदवा',
    tab_scan_asset: 'क्यूआर स्कॅनर',
    tab_ewaste_handover: 'ई-कचरा हस्तांतरण',
    start_task: 'काम सुरू करा',
    confirm_collection: 'संकलन पूर्ण केले',
    status_pending: 'प्रलंबित',
    status_in_progress: 'चालू आहे',
    status_completed: 'पूर्ण झाले',
    status_submitted: 'सादर केले',
    status_assigned: 'नेमले',
    status_collected: 'संकलित',
    status_delivered: 'पुनर्चक्रीकरण केंद्रात सुपूर्द',

    // Bins & Priority
    critical_bins: 'तातडीने लक्ष देण्याजोग्या कुंड्या',
    fill_level: 'भरलेली पातळी',
    expected_fill: 'उद्याची अपेक्षित भरलेली पातळी',
    predicted_overflow: 'ओव्हरफ्लो होण्याचा अंदाज',
    statistical_estimate: 'सांख्यिकी मॉडेल अंदाज (सेन्सर रहित)',
  },

  hi: {
    // Brand & General
    app_name: 'इकोनेक्सस नासिक',
    tagline: 'स्मार्ट कचरा प्रबंधन एवं नासिक नगर निगम परिचालन',
    civic_portal: 'नागरिक अपशिष्ट प्रबंधन पोर्टल',
    swachh_nashik: 'स्वच्छ नासिक',
    system_status: 'प्रणाली स्थिति: सक्रिय',
    engine_active: 'इंजन: सक्रिय',
    language: 'भाषा',
    theme: 'थीम',
    light_mode: 'लाइट मोड',
    dark_mode: 'डार्क मोड',
    sign_out: 'लॉग आउट (Sign Out)',
    sign_in: 'लॉग इन (Sign In)',
    back_to_home: 'मुख्य पृष्ठ पर लौटें',
    loading: 'लोड हो रहा है...',
    refresh: 'रिफ्रेश करें',

    // Landing Page
    landing_badge: 'नासिक नगर निगम (NMC) नागरिक प्रौद्योगिकी पहल',
    landing_title: 'स्वच्छ और हरित नासिक के लिए स्मार्ट कचरा प्रबंधन',
    landing_subtitle: 'नासिक के नागरिकों, सफाई कर्मचारियों और नगर निगम प्रशासन के लिए पारदर्शी कचरा ट्रैकिंग, ई-कचरा रीसाइक्लिंग और स्वच्छ शहर।',
    portal_citizen_title: 'नागरिक सेवा पोर्टल',
    portal_citizen_desc: 'कचरा पात्र भरने की शिकायत दर्ज करें, घर बैठे ई-कचरा उठवाने का अनुरोध करें और शिकायत की स्थिति जांचें।',
    portal_citizen_btn: 'नागरिक प्रवेश',
    portal_worker_title: 'सफाई कर्मचारी पोर्टल',
    portal_worker_desc: 'दैनिक कचरा संग्रहण कार्य, सुझाई गई रूट योजना, क्यूआर स्कैनिंग और फील्ड समस्याओं की रिपोर्टिंग।',
    portal_worker_btn: 'कर्मचारी साइन इन',
    portal_org_title: 'नगर निगम प्रशासन',
    portal_org_desc: 'कचरा पात्र स्तर निगरानी, कार्यबल प्रबंधन, ई-कचरा विनियमन और शहरव्यापी एनालिटिक्स।',
    portal_org_btn: 'प्रशासक लॉगिन',
    explore_facilities: 'प्रमाणित केंद्र देखें',
    key_metrics_title: 'नागरिक प्रभाव आंकड़ों में',
    monitored_bins: 'निगरानी वाले पात्र',
    daily_clearance: 'दैनिक कचरा उठाव',
    verified_centers: 'सत्यापित ई-कचरा केंद्र',
    municipal_divisions: 'प्रशासनिक प्रभाग',

    // Navigation & Sidebar
    nav_overview: 'अवलोकन',
    nav_bins: 'कचरा पात्र प्रबंधन',
    nav_map: 'लाइव मानचित्र (Live Map)',
    nav_priority: 'संग्रहण प्राथमिकता',
    nav_tasks: 'संग्रहण कार्य',
    nav_workers: 'सफाई कर्मी दल',
    nav_complaints: 'नागरिक शिकायतें',
    nav_ewaste: 'ई-कचरा प्रबंधन',
    nav_facilities: 'सत्यापित केंद्र',
    nav_analytics: 'विश्लेषण एवं रिपोर्ट',

    // Citizen Dashboard
    tab_report_waste: 'कचरा समस्या दर्ज करें',
    tab_my_complaints: 'मेरी शिकायतें',
    tab_ewaste_pickup: 'ई-कचरा उठाव अनुरोध',
    tab_my_ewaste: 'मेरे ई-कचरा अनुरोध',
    tab_facilities: 'सार्वजनिक संग्रहण केंद्र',
    complaint_title: 'शिकायत का शीर्षक',
    complaint_category: 'श्रेणी',
    complaint_ward: 'प्रभाग / क्षेत्र',
    complaint_landmark: 'पता / लैंडमार्क',
    complaint_desc: 'विवरण (वैकल्पिक)',
    submit_complaint: 'शिकायत दर्ज करें',
    ewaste_category: 'ई-कचरा श्रेणी',
    ewaste_count: 'अनुमानित वस्तुओं की संख्या',
    ewaste_address: 'घर का पता',
    ewaste_date: 'पसंदीदा तिथि',
    submit_ewaste: 'संग्रहण समय तय करें',

    // Worker Dashboard
    worker_shift: 'सक्रिय पाली (Shift)',
    worker_tour: 'दैनिक अपशिष्ट संग्रहण दौरा',
    tab_assigned_tasks: 'आवंटित कार्य',
    tab_suggested_route: 'सुझाई गई रूट योजना',
    tab_record_collection: 'कचरा उठाव दर्ज करें',
    tab_report_issue: 'समस्या की रिपोर्ट करें',
    tab_scan_asset: 'क्यूआर स्कैनर',
    tab_ewaste_handover: 'ई-कचरा हस्तांतरण',
    start_task: 'कार्य शुरू करें',
    confirm_collection: 'कचरा उठाव पूर्ण',
    status_pending: 'लंबित',
    status_in_progress: 'प्रगति पर',
    status_completed: 'पूर्ण',
    status_submitted: 'प्रस्तुत',
    status_assigned: 'आवंटित',
    status_collected: 'एकत्रित',
    status_delivered: 'रीसाइक्लिंग केंद्र में सुपुर्द',

    // Bins & Priority
    critical_bins: 'अति-आवश्यक कचरा पात्र',
    fill_level: 'भराव स्तर',
    expected_fill: 'कल का अनुमानित भराव स्तर',
    predicted_overflow: 'अनुमानित ओवरफ्लो जोखिम',
    statistical_estimate: 'सांख्यिकीय मॉडल अनुमान (सेंसर रहित)',
  },
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('econexus_lang') || 'en';
  });

  const changeLanguage = (newLang) => {
    if (translations[newLang]) {
      setLang(newLang);
      localStorage.setItem('econexus_lang', newLang);
    }
  };

  const t = (key, fallback) => {
    return translations[lang]?.[key] || translations.en[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t, availableLangs: ['en', 'mr', 'hi'] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};
