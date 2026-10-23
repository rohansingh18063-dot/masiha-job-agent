/*
 * Main cities and district headquarters of every state and union territory, so students can pick a city
 * straight after the state, even before we have companies there. Cities from uploaded company sheets are
 * added on top of this list automatically. Add a city by adding it to its state's list.
 */
export const INDIA_CITIES = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Rajahmundry", "Kakinada", "Kadapa", "Anantapur", "Eluru", "Ongole", "Vizianagaram", "Srikakulam", "Machilipatnam", "Chittoor", "Proddatur", "Nandyal", "Bhimavaram", "Tenali", "Amaravati", "Hindupur", "Tadepalligudem", "Narasaraopet"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro", "Bomdila", "Tezu", "Along", "Roing", "Namsai"],
  Assam: ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Tezpur", "Nagaon", "Tinsukia", "Bongaigaon", "Dhubri", "Diphu", "North Lakhimpur", "Sivasagar", "Goalpara", "Karimganj", "Barpeta", "Golaghat", "Kokrajhar", "Mangaldoi", "Hailakandi"],
  Bihar: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia", "Arrah", "Begusarai", "Katihar", "Munger", "Chhapra", "Bihar Sharif", "Hajipur", "Sasaram", "Dehri", "Siwan", "Motihari", "Bettiah", "Saharsa", "Samastipur", "Nawada", "Buxar", "Kishanganj", "Sitamarhi", "Jamalpur", "Aurangabad (Bihar)", "Madhubani", "Jehanabad"],
  Chhattisgarh: ["Raipur", "Bhilai", "Durg", "Bilaspur", "Korba", "Rajnandgaon", "Raigarh", "Jagdalpur", "Ambikapur", "Dhamtari", "Mahasamund", "Kanker", "Janjgir", "Kawardha", "Bemetara", "Mungeli", "Kondagaon", "Dantewada", "Baloda Bazar", "Jashpur", "Naya Raipur"],
  Goa: ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Bicholim", "Curchorem", "Canacona", "Old Goa", "Porvorim"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Anand", "Nadiad", "Bharuch", "Vapi", "Navsari", "Valsad", "Mehsana", "Morbi", "Surendranagar", "Gandhidham", "Bhuj", "Porbandar", "Palanpur", "Godhra", "Patan", "Veraval", "Amreli", "Dahod", "Botad", "Himmatnagar", "Ankleshwar"],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula", "Bhiwani", "Sirsa", "Bahadurgarh", "Jind", "Thanesar", "Kaithal", "Rewari", "Palwal", "Kurukshetra", "Fatehabad", "Jhajjar", "Narnaul", "Manesar"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Mandi", "Solan", "Kullu", "Manali", "Baddi", "Hamirpur (HP)", "Una", "Bilaspur (HP)", "Chamba", "Nahan", "Palampur", "Kangra", "Keylong", "Reckong Peo"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Giridih", "Ramgarh", "Phusro", "Medininagar", "Chaibasa", "Dumka", "Godda", "Sahibganj", "Lohardaga", "Gumla", "Chatra", "Koderma", "Pakur", "Seraikela"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Dharwad", "Belagavi", "Kalaburagi", "Davanagere", "Ballari", "Shivamogga", "Tumakuru", "Udupi", "Vijayapura", "Hassan", "Raichur", "Bidar", "Chitradurga", "Mandya", "Kolar", "Chikkamagaluru", "Bagalkot", "Gadag", "Karwar", "Hospet", "Chikkaballapur", "Ramanagara", "Madikeri", "Haveri", "Koppal", "Yadgir", "Manipal"],
  Kerala: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha", "Palakkad", "Kottayam", "Malappuram", "Kasaragod", "Pathanamthitta", "Idukki", "Kalpetta", "Thalassery", "Ponnani", "Kakkanad", "Aluva", "Tirur"],
  "Madhya Pradesh": [
    "Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa", "Murwara (Katni)", "Singrauli", "Burhanpur", "Khandwa", "Bhind", "Chhindwara", "Guna", "Shivpuri", "Vidisha", "Chhatarpur",
    "Damoh", "Mandsaur", "Khargone", "Neemuch", "Pithampur", "Hoshangabad (Narmadapuram)", "Itarsi", "Sehore", "Betul", "Seoni", "Datia", "Nagda", "Dhar", "Raisen", "Shahdol", "Morena", "Balaghat", "Tikamgarh", "Sidhi", "Mandla",
    "Rajgarh", "Shajapur", "Harda", "Narsinghpur", "Panna", "Umaria", "Anuppur", "Dindori", "Barwani", "Jhabua", "Alirajpur", "Ashoknagar", "Agar Malwa", "Sheopur", "Niwari", "Mauganj", "Maihar", "Pandhurna", "Mhow", "Sanchi",
  ],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad (Chhatrapati Sambhajinagar)", "Navi Mumbai", "Solapur", "Kalyan", "Vasai-Virar", "Pimpri-Chinchwad", "Kolhapur", "Amravati", "Sangli", "Malegaon", "Jalgaon", "Akola", "Latur", "Dhule", "Ahmednagar", "Chandrapur", "Parbhani", "Ichalkaranji", "Jalna", "Bhiwandi", "Panvel", "Satara", "Beed", "Yavatmal", "Nanded", "Wardha", "Ratnagiri", "Gondia", "Osmanabad (Dharashiv)", "Baramati", "Lonavala", "Alibag", "Sindhudurg", "Bhandara", "Buldhana", "Washim", "Hingoli", "Gadchiroli", "Nandurbar"],
  Manipur: ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Kakching", "Ukhrul", "Senapati", "Tamenglong", "Jiribam", "Moreh"],
  Meghalaya: ["Shillong", "Tura", "Jowai", "Nongstoin", "Williamnagar", "Baghmara", "Resubelpara", "Nongpoh", "Mairang"],
  Mizoram: ["Aizawl", "Lunglei", "Champhai", "Serchhip", "Kolasib", "Saiha", "Lawngtlai", "Mamit"],
  Nagaland: ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Zunheboto", "Mon", "Phek", "Kiphire", "Longleng", "Peren"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Baripada", "Jharsuguda", "Jeypore", "Angul", "Dhenkanal", "Kendrapara", "Jajpur", "Bargarh", "Rayagada", "Koraput", "Paradip", "Bolangir", "Bhawanipatna", "Keonjhar", "Sundargarh", "Talcher"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur", "Pathankot", "Moga", "Batala", "Abohar", "Malerkotla", "Khanna", "Phagwara", "Muktsar", "Barnala", "Rajpura", "Firozpur", "Kapurthala", "Sangrur", "Faridkot", "Gurdaspur", "Zirakpur", "Fazilka", "Tarn Taran", "Nawanshahr", "Rupnagar", "Fatehgarh Sahib", "Mansa"],
  Rajasthan: ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Bharatpur", "Sikar", "Sri Ganganagar", "Pali", "Tonk", "Kishangarh", "Beawar", "Hanumangarh", "Dhaulpur", "Sawai Madhopur", "Churu", "Jhunjhunu", "Bundi", "Chittorgarh", "Banswara", "Barmer", "Jaisalmer", "Nagaur", "Dungarpur", "Jhalawar", "Rajsamand", "Karauli", "Dausa", "Sirohi", "Pratapgarh (Rajasthan)", "Jalore", "Baran", "Neemrana", "Bhiwadi", "Mount Abu"],
  Sikkim: ["Gangtok", "Namchi", "Gyalshing", "Mangan", "Rangpo", "Singtam", "Jorethang", "Pakyong", "Soreng"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Thanjavur", "Dindigul", "Hosur", "Nagercoil", "Kanchipuram", "Karur", "Cuddalore", "Kumbakonam", "Tiruvannamalai", "Pollachi", "Rajapalayam", "Sivakasi", "Pudukkottai", "Namakkal", "Krishnagiri", "Dharmapuri", "Villupuram", "Nagapattinam", "Ooty", "Chengalpattu", "Tambaram", "Avadi", "Ramanathapuram", "Theni", "Virudhunagar", "Ariyalur", "Perambalur", "Tiruvallur", "Kallakurichi", "Ranipet", "Tenkasi", "Tirupattur"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam", "Secunderabad", "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet", "Siddipet", "Miryalaguda", "Mancherial", "Kothagudem", "Sangareddy", "Kamareddy", "Jagtial", "Medak", "Wanaparthy", "Vikarabad", "Gachibowli", "Cyberabad"],
  Tripura: ["Agartala", "Udaipur (Tripura)", "Dharmanagar", "Kailashahar", "Belonia", "Ambassa", "Khowai", "Teliamura", "Sabroom", "Bishalgarh"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Meerut", "Prayagraj", "Noida", "Greater Noida", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Firozabad", "Jhansi", "Muzaffarnagar", "Mathura", "Ayodhya", "Rampur", "Shahjahanpur", "Farrukhabad", "Mau", "Hapur", "Etawah", "Mirzapur", "Bulandshahr", "Sambhal", "Amroha", "Hardoi", "Fatehpur", "Raebareli", "Orai", "Sitapur", "Bahraich", "Unnao", "Jaunpur", "Lakhimpur", "Hathras", "Banda", "Pilibhit", "Barabanki", "Basti", "Gonda", "Azamgarh", "Sultanpur", "Ballia", "Deoria", "Etah", "Mainpuri", "Lalitpur", "Kannauj", "Bijnor", "Budaun", "Ghazipur", "Pratapgarh (UP)", "Chandauli", "Kushinagar", "Amethi"],
  Uttarakhand: ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh", "Nainital", "Almora", "Pithoragarh", "Mussoorie", "Kotdwar", "Ramnagar", "Pauri", "Tehri", "Bageshwar", "Champawat", "Uttarkashi", "Gopeshwar", "Rudraprayag"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Kharagpur", "Haldia", "Malda", "Baharampur", "Krishnanagar", "Barasat", "Bidhannagar (Salt Lake)", "New Town", "Darjeeling", "Jalpaiguri", "Cooch Behar", "Bankura", "Purulia", "Midnapore", "Tamluk", "Hooghly", "Chinsurah", "Raiganj", "Balurghat", "Alipurduar", "Bolpur", "Kalyani", "Habra", "Serampore"],
  "Andaman and Nicobar Islands": ["Port Blair", "Car Nicobar", "Mayabunder", "Diglipur", "Rangat", "Havelock"],
  Chandigarh: ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  Delhi: ["New Delhi", "Delhi", "Dwarka", "Rohini", "Saket", "Connaught Place", "Okhla", "Nehru Place", "Janakpuri", "Laxmi Nagar", "Karol Bagh", "Pitampura", "Mayur Vihar", "Vasant Kunj", "Shahdara"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Sopore", "Kathua", "Udhampur", "Rajouri", "Poonch", "Pulwama", "Kupwara", "Budgam", "Ganderbal", "Doda", "Kishtwar", "Samba", "Reasi", "Ramban", "Bandipora", "Shopian", "Kulgam"],
  Ladakh: ["Leh", "Kargil"],
  Lakshadweep: ["Kavaratti", "Agatti", "Minicoy", "Amini", "Andrott"],
  Puducherry: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
};

// Old names and common spellings -> the name in the list above.
const OTHER_NAMES = {
  bombay: "Mumbai", bangalore: "Bengaluru", bengalooru: "Bengaluru", calcutta: "Kolkata", madras: "Chennai", gurgaon: "Gurugram",
  poona: "Pune", baroda: "Vadodara", trivandrum: "Thiruvananthapuram", cochin: "Kochi", ernakulam: "Kochi", calicut: "Kozhikode",
  mysore: "Mysuru", mangalore: "Mangaluru", hubli: "Hubballi", belgaum: "Belagavi", gulbarga: "Kalaburagi", bellary: "Ballari",
  shimoga: "Shivamogga", tumkur: "Tumakuru", bijapur: "Vijayapura", vizag: "Visakhapatnam", vishakhapatnam: "Visakhapatnam",
  allahabad: "Prayagraj", banaras: "Varanasi", benares: "Varanasi", kashi: "Varanasi", faizabad: "Ayodhya", pondicherry: "Puducherry",
  trichy: "Tiruchirappalli", tiruchi: "Tiruchirappalli", tuticorin: "Thoothukudi", tanjore: "Thanjavur", ooty: "Ooty", udhagamandalam: "Ooty",
  conjeevaram: "Kanchipuram", kanchi: "Kanchipuram", hoshangabad: "Hoshangabad (Narmadapuram)", narmadapuram: "Hoshangabad (Narmadapuram)",
  katni: "Murwara (Katni)", murwara: "Murwara (Katni)", aurangabad: "Aurangabad (Chhatrapati Sambhajinagar)",
  chhatrapatisambhajinagar: "Aurangabad (Chhatrapati Sambhajinagar)", osmanabad: "Osmanabad (Dharashiv)", dharashiv: "Osmanabad (Dharashiv)",
  saltlake: "Bidhannagar (Salt Lake)", bidhannagar: "Bidhannagar (Salt Lake)", burdwan: "Bardhaman", berhampore: "Baharampur",
  medinipur: "Midnapore", daltonganj: "Medininagar", jamshedpurtatanagar: "Jamshedpur", tatanagar: "Jamshedpur",
  newdelhi: "New Delhi", ncr: "New Delhi", greaternoida: "Greater Noida", noidaextension: "Greater Noida", navimumbai: "Navi Mumbai",
  pimpri: "Pimpri-Chinchwad", chinchwad: "Pimpri-Chinchwad", vasai: "Vasai-Virar", virar: "Vasai-Virar", panjim: "Panaji",
  madgaon: "Margao", vasco: "Vasco da Gama", gauhati: "Guwahati", simla: "Shimla", jullundur: "Jalandhar", ferozepur: "Firozpur",
  sasnagar: "Mohali", sahibzadaajitsinghnagar: "Mohali", rajamahendravaram: "Rajahmundry", rajahmahendravaram: "Rajahmundry",
};

export const cityKey = (s) => String(s || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z]/g, "");

const BY_STATE = new Map(Object.entries(INDIA_CITIES).map(([state, list]) => [
  state,
  new Map([
    ...list.map((c) => [cityKey(c), c]),
    // "Murwara (Katni)" can be typed as "Katni" too.
    ...list.flatMap((c) => { const m = c.match(/\((.+)\)/); return m && !/^(bihar|hp|up|rajasthan|tripura)$/i.test(m[1]) ? [[cityKey(m[1]), c]] : []; }),
  ]),
]));

/** The tidy name for a city typed any way ("bhopal", "BHOPAL", "Bombay"), or a tidied version of what was typed. */
export function canonicalCity(state, city) {
  const key = cityKey(city);
  if (!key) return "";
  const known = BY_STATE.get(state)?.get(key);
  if (known) return known;
  const other = OTHER_NAMES[key];
  if (other && (!state || INDIA_CITIES[state]?.includes(other))) return other;
  const t = String(city).replace(/\s+/g, " ").trim();
  return t === t.toLowerCase() || t === t.toUpperCase() ? t.toLowerCase().replace(/\b[a-z]/g, (ch) => ch.toUpperCase()) : t;
}
