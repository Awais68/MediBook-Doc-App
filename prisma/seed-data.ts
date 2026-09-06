export const SPECIALTIES = [
  { name: "General Physician", icon: "stethoscope", sortOrder: 1, description: "First stop for fever, infections, and everyday illness." },
  { name: "Cardiologist", icon: "heart-pulse", sortOrder: 2, description: "Heart, blood pressure and circulation specialists." },
  { name: "Dermatologist", icon: "sparkles", sortOrder: 3, description: "Skin, hair and nail conditions." },
  { name: "Gynecologist", icon: "baby", sortOrder: 4, description: "Women's health, pregnancy and fertility." },
  { name: "Pediatrician", icon: "toy-brick", sortOrder: 5, description: "Child health from newborn to teenager." },
  { name: "Orthopedic Surgeon", icon: "bone", sortOrder: 6, description: "Bones, joints, fractures and sports injuries." },
  { name: "Neurologist", icon: "brain", sortOrder: 7, description: "Brain, spine and nervous system." },
  { name: "ENT Specialist", icon: "ear", sortOrder: 8, description: "Ear, nose, throat and sinus problems." },
  { name: "Psychiatrist", icon: "brain-circuit", sortOrder: 9, description: "Mental health, anxiety, depression and sleep." },
  { name: "Gastroenterologist", icon: "activity", sortOrder: 10, description: "Stomach, liver and digestive system." },
  { name: "Urologist", icon: "droplets", sortOrder: 11, description: "Kidney, bladder and urinary tract." },
  { name: "Endocrinologist", icon: "flask-conical", sortOrder: 12, description: "Diabetes, thyroid and hormones." },
  { name: "Dentist", icon: "smile", sortOrder: 13, description: "Teeth, gums and oral surgery." },
  { name: "Eye Specialist", icon: "eye", sortOrder: 14, description: "Vision, cataract and retina care." },
  { name: "Pulmonologist", icon: "wind", sortOrder: 15, description: "Lungs, asthma and breathing problems." },
  { name: "Nephrologist", icon: "filter", sortOrder: 16, description: "Kidney disease and dialysis." },
];

/** Symptom → specialty, so patients can search the way they actually talk. */
export const SYMPTOMS: Record<string, string[]> = {
  "General Physician": ["Fever", "Flu", "Body ache", "Weakness", "Typhoid", "Dengue", "Covid symptoms"],
  Cardiologist: ["Chest pain", "High blood pressure", "Palpitations", "Shortness of breath", "Heart attack"],
  Dermatologist: ["Acne", "Hair fall", "Eczema", "Skin allergy", "Pimples", "Dandruff", "Fungal infection"],
  Gynecologist: ["Pregnancy", "Irregular periods", "PCOS", "Infertility", "Menopause"],
  Pediatrician: ["Child fever", "Vaccination", "Newborn care", "Child cough", "Growth delay"],
  "Orthopedic Surgeon": ["Back pain", "Knee pain", "Fracture", "Joint pain", "Slipped disc", "Frozen shoulder"],
  Neurologist: ["Headache", "Migraine", "Seizures", "Numbness", "Stroke", "Vertigo"],
  "ENT Specialist": ["Sore throat", "Ear pain", "Sinusitis", "Tonsillitis", "Hearing loss", "Nose bleed"],
  Psychiatrist: ["Anxiety", "Depression", "Insomnia", "Panic attacks", "Stress", "OCD"],
  Gastroenterologist: ["Stomach pain", "Acidity", "Constipation", "Hepatitis", "Ulcer", "IBS"],
  Urologist: ["Kidney stones", "Burning urination", "Prostate", "Blood in urine"],
  Endocrinologist: ["Diabetes", "Thyroid", "Obesity", "Hormonal imbalance"],
  Dentist: ["Toothache", "Cavity", "Gum bleeding", "Teeth whitening", "Root canal"],
  "Eye Specialist": ["Blurred vision", "Cataract", "Red eye", "Eye pain", "Glaucoma"],
  Pulmonologist: ["Asthma", "Chronic cough", "Breathing difficulty", "Tuberculosis", "Pneumonia"],
  Nephrologist: ["Kidney failure", "Dialysis", "Swelling in legs", "Protein in urine"],
};

export const HOSPITALS = [
  { name: "Shaukat Khanum Memorial Hospital", city: "Lahore", area: "Johar Town", address: "7A Block R-3, Johar Town, Lahore", phone: "+924235905000", type: "HOSPITAL", facilities: ["Pharmacy", "Lab", "ICU", "Emergency", "Parking", "Wheelchair Access"], lat: 31.4697, lng: 74.2728 },
  { name: "Doctors Hospital & Medical Centre", city: "Lahore", area: "Johar Town", address: "152-G/1, Canal Bank Road, Johar Town, Lahore", phone: "+924235301301", type: "HOSPITAL", facilities: ["Pharmacy", "Lab", "ICU", "Emergency", "Parking", "Cafeteria"], lat: 31.4712, lng: 74.2851 },
  { name: "Hameed Latif Hospital", city: "Lahore", area: "Garden Town", address: "14 Abu Bakar Block, New Garden Town, Lahore", phone: "+924235913000", type: "HOSPITAL", facilities: ["Pharmacy", "Lab", "Emergency", "Parking"], lat: 31.5102, lng: 74.3121 },
  { name: "Fatima Memorial Hospital", city: "Lahore", area: "Shadman", address: "Shadman, Lahore", phone: "+924235957000", type: "HOSPITAL", facilities: ["Pharmacy", "Lab", "ICU", "Emergency"], lat: 31.5432, lng: 74.3196 },
  { name: "Aga Khan University Hospital", city: "Karachi", area: "Stadium Road", address: "Stadium Road, Karachi", phone: "+922134861000", type: "HOSPITAL", facilities: ["Pharmacy", "Lab", "ICU", "Emergency", "Parking", "Wheelchair Access", "Cafeteria"], lat: 24.8919, lng: 67.0741 },
  { name: "Liaquat National Hospital", city: "Karachi", area: "Stadium Road", address: "National Stadium Road, Karachi", phone: "+922134412000", type: "HOSPITAL", facilities: ["Pharmacy", "Lab", "ICU", "Emergency", "Parking"], lat: 24.8896, lng: 67.0692 },
  { name: "South City Hospital", city: "Karachi", area: "Clifton", address: "Block 3, Clifton, Karachi", phone: "+922135201000", type: "HOSPITAL", facilities: ["Pharmacy", "Lab", "Emergency", "Parking"], lat: 24.8138, lng: 67.0299 },
  { name: "Shifa International Hospital", city: "Islamabad", area: "H-8/4", address: "Pitras Bukhari Road, H-8/4, Islamabad", phone: "+925184603000", type: "HOSPITAL", facilities: ["Pharmacy", "Lab", "ICU", "Emergency", "Parking", "Wheelchair Access"], lat: 33.6844, lng: 73.0654 },
  { name: "Kulsum International Hospital", city: "Islamabad", area: "Blue Area", address: "Blue Area, Islamabad", phone: "+925128900000", type: "HOSPITAL", facilities: ["Pharmacy", "Lab", "Emergency"], lat: 33.7104, lng: 73.0551 },
  { name: "Al-Shifa Family Clinic", city: "Rawalpindi", area: "Satellite Town", address: "Satellite Town, Rawalpindi", phone: "+925134567890", type: "CLINIC", facilities: ["Pharmacy", "Parking"], lat: 33.6362, lng: 73.0685 },
  { name: "Chughtai Lab & Diagnostics", city: "Lahore", area: "Gulberg", address: "Main Boulevard, Gulberg III, Lahore", phone: "+924211729", type: "DIAGNOSTIC_CENTER", facilities: ["Lab", "Parking", "Home Sampling"], lat: 31.5169, lng: 74.3484 },
  { name: "Faisalabad Institute of Cardiology", city: "Faisalabad", area: "Sargodha Road", address: "Sargodha Road, Faisalabad", phone: "+924199210000", type: "HOSPITAL", facilities: ["Lab", "ICU", "Emergency", "Parking"], lat: 31.4504, lng: 73.135 },
];

export const DOCTORS = [
  { name: "Ayesha Khan", gender: "FEMALE", specialty: "Cardiologist", pmdc: "PMDC-31245-P", exp: 16, fee: 4000, followUp: 0, city: "Lahore", hospitals: ["Shaukat Khanum Memorial Hospital", "Doctors Hospital & Medical Centre"], degrees: [["MBBS", "King Edward Medical University", 2005], ["FCPS (Cardiology)", "College of Physicians & Surgeons Pakistan", 2012]], langs: ["Urdu", "English", "Punjabi"], bio: "Interventional cardiologist with 16 years of experience in angioplasty, heart failure management and preventive cardiology. Special interest in women's heart health.", rating: 4.8, video: true, videoFee: 2500 },
  { name: "Bilal Ahmed", gender: "MALE", specialty: "Orthopedic Surgeon", pmdc: "PMDC-40921-P", exp: 12, fee: 3000, followUp: 1000, city: "Lahore", hospitals: ["Doctors Hospital & Medical Centre", "Hameed Latif Hospital"], degrees: [["MBBS", "Allama Iqbal Medical College", 2009], ["FCPS (Orthopedics)", "CPSP", 2016]], langs: ["Urdu", "English"], bio: "Orthopedic and joint replacement surgeon. Handles knee and hip replacements, sports injuries, arthroscopy and complex fracture care.", rating: 4.6, video: false },
  { name: "Sana Malik", gender: "FEMALE", specialty: "Gynecologist", pmdc: "PMDC-28773-P", exp: 20, fee: 3500, followUp: 1500, city: "Lahore", hospitals: ["Fatima Memorial Hospital", "Hameed Latif Hospital"], degrees: [["MBBS", "Fatima Jinnah Medical University", 2001], ["FCPS (Obs & Gynae)", "CPSP", 2008], ["MRCOG", "Royal College, UK", 2011]], langs: ["Urdu", "English", "Punjabi"], bio: "Consultant gynecologist and obstetrician with 20 years of practice. High-risk pregnancy, laparoscopic surgery, infertility and PCOS management.", rating: 4.9, video: true, videoFee: 2000 },
  { name: "Usman Tariq", gender: "MALE", specialty: "General Physician", pmdc: "PMDC-51230-P", exp: 8, fee: 1500, followUp: 0, city: "Lahore", hospitals: ["Hameed Latif Hospital"], degrees: [["MBBS", "Services Institute of Medical Sciences", 2014], ["FCPS (Medicine)", "CPSP", 2020]], langs: ["Urdu", "English", "Punjabi"], bio: "General physician treating fever, infections, diabetes and hypertension. Believes in explaining every prescription so patients actually follow it.", rating: 4.5, video: true, videoFee: 1000 },
  { name: "Fatima Zahra", gender: "FEMALE", specialty: "Dermatologist", pmdc: "PMDC-46112-P", exp: 10, fee: 2500, followUp: 1000, city: "Karachi", hospitals: ["South City Hospital", "Aga Khan University Hospital"], degrees: [["MBBS", "Dow University of Health Sciences", 2012], ["FCPS (Dermatology)", "CPSP", 2018]], langs: ["Urdu", "English", "Sindhi"], bio: "Dermatologist focused on acne, pigmentation, hair loss and cosmetic dermatology. Evidence-based treatment, no unnecessary procedures.", rating: 4.7, video: true, videoFee: 1800 },
  { name: "Imran Sheikh", gender: "MALE", specialty: "Neurologist", pmdc: "PMDC-33988-P", exp: 18, fee: 4500, followUp: 2000, city: "Karachi", hospitals: ["Aga Khan University Hospital", "Liaquat National Hospital"], degrees: [["MBBS", "Aga Khan University", 2003], ["FCPS (Neurology)", "CPSP", 2011]], langs: ["Urdu", "English"], bio: "Consultant neurologist. Epilepsy, stroke, migraine and movement disorders. Runs a dedicated headache clinic twice a week.", rating: 4.8, video: false },
  { name: "Hina Qureshi", gender: "FEMALE", specialty: "Pediatrician", pmdc: "PMDC-49220-P", exp: 11, fee: 2000, followUp: 500, city: "Karachi", hospitals: ["Liaquat National Hospital"], degrees: [["MBBS", "Sindh Medical College", 2011], ["FCPS (Paediatrics)", "CPSP", 2017]], langs: ["Urdu", "English", "Sindhi"], bio: "Pediatrician for newborn to 16 years. Vaccination schedules, growth monitoring, childhood asthma and nutrition counselling.", rating: 4.9, video: true, videoFee: 1500 },
  { name: "Kamran Yousaf", gender: "MALE", specialty: "Gastroenterologist", pmdc: "PMDC-37650-P", exp: 14, fee: 3500, followUp: 1200, city: "Islamabad", hospitals: ["Shifa International Hospital"], degrees: [["MBBS", "Rawalpindi Medical College", 2007], ["FCPS (Gastroenterology)", "CPSP", 2015]], langs: ["Urdu", "English", "Pashto"], bio: "Gastroenterologist and endoscopist. Hepatitis B/C treatment, IBS, acid reflux, colonoscopy and liver disease management.", rating: 4.6, video: true, videoFee: 2200 },
  { name: "Nadia Baig", gender: "FEMALE", specialty: "Psychiatrist", pmdc: "PMDC-52001-P", exp: 9, fee: 3000, followUp: 1500, city: "Islamabad", hospitals: ["Kulsum International Hospital", "Shifa International Hospital"], degrees: [["MBBS", "Army Medical College", 2013], ["FCPS (Psychiatry)", "CPSP", 2019]], langs: ["Urdu", "English"], bio: "Psychiatrist treating anxiety, depression, OCD and sleep disorders. Combines medication with structured therapy; confidential and non-judgemental.", rating: 4.9, video: true, videoFee: 2500 },
  { name: "Tariq Mehmood", gender: "MALE", specialty: "ENT Specialist", pmdc: "PMDC-42317-P", exp: 13, fee: 2200, followUp: 800, city: "Rawalpindi", hospitals: ["Al-Shifa Family Clinic", "Kulsum International Hospital"], degrees: [["MBBS", "Punjab Medical College", 2008], ["FCPS (ENT)", "CPSP", 2016]], langs: ["Urdu", "English", "Punjabi"], bio: "ENT surgeon. Sinus surgery, tonsillectomy, hearing assessment and vertigo management for adults and children.", rating: 4.4, video: false },
  { name: "Zainab Rizvi", gender: "FEMALE", specialty: "Endocrinologist", pmdc: "PMDC-45880-P", exp: 12, fee: 3200, followUp: 1000, city: "Lahore", hospitals: ["Shaukat Khanum Memorial Hospital", "Chughtai Lab & Diagnostics"], degrees: [["MBBS", "King Edward Medical University", 2010], ["FCPS (Endocrinology)", "CPSP", 2018]], langs: ["Urdu", "English"], bio: "Diabetes and thyroid specialist. Insulin optimisation, gestational diabetes, PCOS and obesity management with a dietitian-led plan.", rating: 4.7, video: true, videoFee: 2000 },
  { name: "Ali Raza", gender: "MALE", specialty: "Pulmonologist", pmdc: "PMDC-39445-P", exp: 15, fee: 2800, followUp: 900, city: "Faisalabad", hospitals: ["Faisalabad Institute of Cardiology"], degrees: [["MBBS", "Nishtar Medical College", 2006], ["FCPS (Pulmonology)", "CPSP", 2014]], langs: ["Urdu", "English", "Punjabi", "Saraiki"], bio: "Chest specialist. Asthma, COPD, tuberculosis and sleep apnoea. Runs a smoking-cessation clinic every Saturday.", rating: 4.5, video: false },
  { name: "Mehwish Anwar", gender: "FEMALE", specialty: "Eye Specialist", pmdc: "PMDC-47733-P", exp: 10, fee: 2000, followUp: 700, city: "Karachi", hospitals: ["South City Hospital"], degrees: [["MBBS", "Dow University of Health Sciences", 2012], ["FCPS (Ophthalmology)", "CPSP", 2019]], langs: ["Urdu", "English"], bio: "Ophthalmologist. Cataract surgery, diabetic retinopathy screening, glaucoma and paediatric squint correction.", rating: 4.6, video: false },
  { name: "Hassan Javed", gender: "MALE", specialty: "Dentist", pmdc: "PMDC-50112-D", exp: 7, fee: 1500, followUp: 0, city: "Lahore", hospitals: ["Hameed Latif Hospital"], degrees: [["BDS", "de'Montmorency College of Dentistry", 2016]], langs: ["Urdu", "English", "Punjabi"], bio: "Dental surgeon. Root canals, crowns, scaling and cosmetic dentistry. Painless procedures with modern anaesthesia protocols.", rating: 4.4, video: false },
  { name: "Rabia Sultan", gender: "FEMALE", specialty: "Nephrologist", pmdc: "PMDC-36990-P", exp: 17, fee: 4000, followUp: 1500, city: "Islamabad", hospitals: ["Shifa International Hospital"], degrees: [["MBBS", "Quaid-e-Azam Medical College", 2004], ["FCPS (Nephrology)", "CPSP", 2013]], langs: ["Urdu", "English"], bio: "Nephrologist managing chronic kidney disease, dialysis and post-transplant care. Strong focus on slowing disease progression.", rating: 4.8, video: true, videoFee: 3000 },
];

/** dayOfWeek → sessions. Fridays are short in Pakistan (Jumma), Sundays mostly off. */
export const SCHEDULE_TEMPLATES = {
  morning: [
    { dayOfWeek: 1, startTime: "09:00", endTime: "13:00" },
    { dayOfWeek: 2, startTime: "09:00", endTime: "13:00" },
    { dayOfWeek: 3, startTime: "09:00", endTime: "13:00" },
    { dayOfWeek: 4, startTime: "09:00", endTime: "13:00" },
    { dayOfWeek: 6, startTime: "10:00", endTime: "13:00" },
  ],
  evening: [
    { dayOfWeek: 1, startTime: "17:00", endTime: "21:00" },
    { dayOfWeek: 2, startTime: "17:00", endTime: "21:00" },
    { dayOfWeek: 3, startTime: "17:00", endTime: "21:00" },
    { dayOfWeek: 5, startTime: "16:00", endTime: "20:00" },
    { dayOfWeek: 6, startTime: "17:00", endTime: "20:00" },
  ],
  split: [
    { dayOfWeek: 1, startTime: "10:00", endTime: "13:00" },
    { dayOfWeek: 1, startTime: "18:00", endTime: "21:00" },
    { dayOfWeek: 3, startTime: "10:00", endTime: "13:00" },
    { dayOfWeek: 3, startTime: "18:00", endTime: "21:00" },
    { dayOfWeek: 5, startTime: "15:00", endTime: "19:00" },
  ],
} as const;

export const PATIENTS = [
  { name: "Ahmed Raza", email: "ahmed@example.com", phone: "+923001234567", gender: "MALE", city: "Lahore", dob: "1992-04-18", blood: "O+" },
  { name: "Maryam Noor", email: "maryam@example.com", phone: "+923004445566", gender: "FEMALE", city: "Lahore", dob: "1996-11-02", blood: "A+" },
  { name: "Saad Iqbal", email: "saad@example.com", phone: "+923217778899", gender: "MALE", city: "Karachi", dob: "1985-01-25", blood: "B+" },
  { name: "Hira Aslam", email: "hira@example.com", phone: "+923331112233", gender: "FEMALE", city: "Islamabad", dob: "1999-07-09", blood: "AB+" },
  { name: "Faizan Ali", email: "faizan@example.com", phone: "+923455556677", gender: "MALE", city: "Rawalpindi", dob: "1978-03-30", blood: "O-" },
  { name: "Komal Shahid", email: "komal@example.com", phone: "+923099998877", gender: "FEMALE", city: "Faisalabad", dob: "1990-09-14", blood: "A-" },
];

export const REVIEW_TEXTS = [
  { rating: 5, title: "Explained everything clearly", comment: "Doctor sahib ne poori tafseel se samjhaya, koi jaldi nahi ki. Wait time bhi sirf 10 minutes tha. Highly recommended." },
  { rating: 5, title: "Very professional", comment: "Excellent experience. The diagnosis was accurate and the medicines worked within two days. Staff was courteous as well." },
  { rating: 4, title: "Good but the wait was long", comment: "Treatment was solid and the doctor listened properly, but I waited around 40 minutes past my slot time." },
  { rating: 5, title: "Best decision", comment: "Second opinion lene aaya tha aur bilkul sahi faisla tha. Unnecessary tests bilkul nahi likhe." },
  { rating: 4, title: "Satisfied", comment: "Clean facility, polite staff, and the doctor answered all my questions without rushing me." },
  { rating: 3, title: "Average visit", comment: "Consultation was fine but felt a bit rushed. Prescription worked though." },
  { rating: 5, title: "Life saver", comment: "Bohat achi tarah handle kiya. Follow-up ka reminder bhi aya jo bohat helpful tha." },
  { rating: 5, title: "Highly skilled", comment: "Years of experience really show. Detailed examination and a clear treatment plan with realistic expectations." },
  { rating: 4, title: "Would visit again", comment: "Reasonable fee for the quality of care. Online booking made the whole process painless." },
];

export const DIAGNOSES = [
  { complaint: "Fever and body ache for 3 days", diagnosis: "Viral fever", advice: "Rest, plenty of fluids, paracetamol for fever above 100°F. Return if fever persists beyond 5 days.", meds: [{ drugName: "Panadol", strength: "500mg", form: "Tablet", dosage: "1 tablet", frequency: "TDS (three times daily)", durationDays: 5, instructions: "After meals" }, { drugName: "Brufen", strength: "400mg", form: "Tablet", dosage: "1 tablet", frequency: "BD (twice daily)", durationDays: 3, instructions: "After food, with plenty of water" }], labs: ["CBC", "Dengue NS1 Antigen"], followUp: 5 },
  { complaint: "Chest tightness on exertion", diagnosis: "Stable angina — suspected", advice: "Avoid heavy exertion until the stress test. Low-salt diet. Report immediately if pain occurs at rest.", meds: [{ drugName: "Aspirin", strength: "75mg", form: "Tablet", dosage: "1 tablet", frequency: "OD (once daily)", durationDays: 30, instructions: "After dinner" }, { drugName: "Atorvastatin", strength: "20mg", form: "Tablet", dosage: "1 tablet", frequency: "OD (once daily)", durationDays: 30, instructions: "At bedtime" }], labs: ["ECG", "Lipid Profile", "Troponin-I"], followUp: 14 },
  { complaint: "Persistent acne on face and back", diagnosis: "Moderate acne vulgaris", advice: "Use a gentle non-comedogenic cleanser twice daily. Avoid picking lesions. Sunscreen every morning.", meds: [{ drugName: "Doxycycline", strength: "100mg", form: "Capsule", dosage: "1 capsule", frequency: "OD (once daily)", durationDays: 30, instructions: "After breakfast, avoid lying down for 30 minutes" }, { drugName: "Adapalene Gel", strength: "0.1%", form: "Gel", dosage: "Pea-sized amount", frequency: "OD (once daily)", durationDays: 60, instructions: "Apply at night on dry skin" }], labs: [], followUp: 30 },
  { complaint: "Lower back pain radiating to left leg", diagnosis: "Lumbar disc prolapse L4-L5", advice: "No heavy lifting. Physiotherapy 3 times a week. Firm mattress and correct sitting posture.", meds: [{ drugName: "Tramadol", strength: "50mg", form: "Capsule", dosage: "1 capsule", frequency: "BD (twice daily)", durationDays: 7, instructions: "After meals" }, { drugName: "Neurobion", strength: "", form: "Tablet", dosage: "1 tablet", frequency: "OD (once daily)", durationDays: 30, instructions: "After breakfast" }], labs: ["MRI Lumbar Spine"], followUp: 21 },
  { complaint: "Frequent headaches with nausea", diagnosis: "Migraine without aura", advice: "Maintain a headache diary. Identify triggers — sleep deprivation, skipped meals, screen glare.", meds: [{ drugName: "Sumatriptan", strength: "50mg", form: "Tablet", dosage: "1 tablet", frequency: "SOS (as needed)", durationDays: 30, instructions: "At the first sign of an attack, max 2 per day" }, { drugName: "Propranolol", strength: "20mg", form: "Tablet", dosage: "1 tablet", frequency: "BD (twice daily)", durationDays: 60, instructions: "After meals" }], labs: [], followUp: 30 },
  { complaint: "Blood sugar consistently above 200", diagnosis: "Type 2 Diabetes Mellitus — uncontrolled", advice: "Strict carbohydrate control, 30 minutes brisk walk daily, home glucose log morning and evening.", meds: [{ drugName: "Metformin", strength: "1000mg", form: "Tablet", dosage: "1 tablet", frequency: "BD (twice daily)", durationDays: 90, instructions: "With breakfast and dinner" }, { drugName: "Glimepiride", strength: "2mg", form: "Tablet", dosage: "1 tablet", frequency: "OD (once daily)", durationDays: 90, instructions: "30 minutes before breakfast" }], labs: ["HbA1c", "Fasting Blood Sugar", "Serum Creatinine"], followUp: 90 },
];
