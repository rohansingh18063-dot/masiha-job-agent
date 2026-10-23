/*
 * Resume helpers per role (keyed by the id in lib/roles-data.js), shown as tap-to-add suggestions in the chat builder:
 * - strengths: core competencies (keywords that ATS software looks for). The student ticks the ones that are true.
 * - bullets:   well-worded work points. The student taps the ones they really did.
 * Nothing here goes on a resume unless the student picks it.
 */
export const DETAILS = {
  "software-developer": {
    strengths: ["Software Development", "Object-Oriented Programming", "Data Structures & Algorithms", "Debugging & Troubleshooting", "Code Review", "Version Control (Git)", "Agile Teamwork", "Clean Code Practices"],
    bullets: ["Wrote clean, well-documented code for new features", "Fixed bugs and improved the stability of existing modules", "Wrote unit tests to catch problems early", "Worked with the team in daily stand-ups and sprint planning", "Reviewed teammates' code and shared feedback", "Used Git for version control and pull requests", "Improved slow parts of the code to make the app faster", "Wrote technical notes and documentation for features"],
  },
  "frontend-developer": {
    strengths: ["Responsive Web Design", "Component-Based UI Development", "Cross-Browser Compatibility", "Web Accessibility", "REST API Integration", "Web Performance Optimisation", "UI Debugging", "Version Control (Git)"],
    bullets: ["Built responsive pages that work on mobile, tablet and desktop", "Turned Figma designs into reusable UI components", "Connected the frontend to REST APIs to show live data", "Improved page load speed by optimising images and code", "Fixed layout and cross-browser bugs", "Made pages more accessible with proper labels and keyboard support", "Managed app state for forms, filters and user sessions", "Worked with designers and backend developers to ship features"],
  },
  "backend-developer": {
    strengths: ["REST API Development", "Database Design", "Authentication & Security", "Server-Side Development", "Query Optimisation", "Error Handling & Logging", "API Documentation", "Version Control (Git)"],
    bullets: ["Built REST APIs used by the web and mobile apps", "Designed database tables and wrote efficient queries", "Added login, sign-up and role-based access", "Validated input and handled errors to keep the server stable", "Improved slow queries to make responses faster", "Wrote API documentation for the frontend team", "Wrote tests for important server functions", "Deployed and monitored the server on the cloud"],
  },
  "full-stack-developer": {
    strengths: ["Full Stack Web Development", "Responsive UI Design", "REST API Development", "Database Design", "User Authentication", "Deployment & Hosting", "Debugging & Testing", "Version Control (Git)"],
    bullets: ["Built complete web features, from the user interface to the database", "Created responsive pages with reusable UI components", "Built REST APIs and connected them to the frontend", "Designed database tables and collections for app data", "Added secure login and user accounts", "Deployed apps and fixed issues reported by users", "Improved performance on both the frontend and the backend", "Used Git and took part in code reviews"],
  },
  "java-developer": {
    strengths: ["Core Java", "Object-Oriented Design", "Spring Boot Development", "REST API Development", "Database Integration (JPA / JDBC)", "Exception Handling", "Unit Testing (JUnit)", "Version Control (Git)"],
    bullets: ["Built REST APIs with Spring Boot", "Wrote business logic using core Java and OOP principles", "Connected the application to MySQL using JPA / Hibernate", "Wrote unit tests with JUnit for key functions", "Fixed bugs and handled exceptions to keep the app stable", "Improved the speed of slow database queries", "Followed clean code and layered architecture practices", "Worked in Agile sprints and used Git with the team"],
  },
  "python-developer": {
    strengths: ["Python Programming", "Web Development (Django / Flask)", "REST API Development", "Automation & Scripting", "Data Handling (Pandas)", "Database Integration", "Debugging & Testing", "Version Control (Git)"],
    bullets: ["Built web apps and APIs with Django / Flask", "Wrote Python scripts to automate repetitive tasks", "Cleaned and processed data with Pandas", "Connected applications to SQL databases", "Wrote tests for important functions", "Fixed bugs and made code easier to read", "Integrated third-party APIs into the application", "Documented code and shared it using Git"],
  },
  "mobile-developer": {
    strengths: ["Mobile App Development", "UI Implementation", "REST API Integration", "Offline Storage", "Push Notifications", "App Performance Optimisation", "App Store / Play Store Release", "Debugging & Testing"],
    bullets: ["Built app screens from designs for Android / iOS", "Connected the app to REST APIs to load live data", "Added login, forms and input validation", "Stored data on the device so parts of the app work offline", "Added push notifications with Firebase", "Fixed crashes and improved app speed", "Tested the app on different phones and screen sizes", "Prepared builds for release on the Play Store / App Store"],
  },
  "data-analyst": {
    strengths: ["Data Analysis", "Data Cleaning", "Dashboard & Report Building", "Data Visualisation", "SQL Querying", "Excel Modelling", "KPI Tracking", "Business Insights"],
    bullets: ["Cleaned and organised raw data from different sources", "Wrote SQL queries to pull and combine data", "Built dashboards to track key business numbers", "Prepared weekly and monthly MIS reports", "Used pivot tables and formulas to analyse sales and trends", "Found patterns in data and shared clear insights with the team", "Automated repeated reports to save time", "Checked data for errors to keep reports accurate"],
  },
  "data-scientist": {
    strengths: ["Machine Learning", "Data Preprocessing", "Feature Engineering", "Model Evaluation", "Exploratory Data Analysis", "Statistical Analysis", "Data Visualisation", "Python Programming"],
    bullets: ["Cleaned and prepared datasets for model training", "Explored data to find patterns and useful features", "Trained and compared machine learning models", "Measured model accuracy and improved the results", "Built charts to explain findings to the team", "Used Pandas, NumPy and Scikit-learn for analysis", "Documented each step clearly in notebooks", "Built a model to solve a real business problem"],
  },
  "software-tester": {
    strengths: ["Manual Testing", "Test Case Design", "Bug Tracking & Reporting", "Regression Testing", "Functional Testing", "API Testing", "Test Automation", "SDLC & STLC"],
    bullets: ["Wrote test cases from requirements and user stories", "Tested new features before each release", "Logged clear bug reports with steps to reproduce", "Ran regression tests to make sure old features still worked", "Tested APIs with Postman", "Wrote automated tests with Selenium", "Worked with developers to retest fixed bugs", "Tracked test progress and bugs in JIRA"],
  },
  "devops-engineer": {
    strengths: ["CI/CD Pipelines", "Cloud Infrastructure", "Containerisation", "Linux Administration", "Infrastructure as Code", "Monitoring & Logging", "Deployment Automation", "Shell Scripting"],
    bullets: ["Set up CI/CD pipelines to build and deploy code automatically", "Packaged applications in Docker containers", "Managed servers and services on AWS / Azure", "Wrote scripts to automate routine server tasks", "Set up monitoring and alerts for live systems", "Managed Linux servers, users and permissions", "Wrote infrastructure as code for repeatable setups", "Helped developers fix build and deployment issues"],
  },
  "it-support": {
    strengths: ["Technical Troubleshooting", "Hardware & Software Installation", "Network Setup & Support", "User Account Management", "Ticket Handling", "System Maintenance", "Data Backup", "End-User Support"],
    bullets: ["Solved hardware, software and network issues for staff", "Installed and set up computers, printers and software", "Managed user accounts, email and access rights", "Set up and maintained LAN, Wi-Fi and network devices", "Handled support tickets and kept users updated", "Took regular data backups", "Kept an inventory of IT equipment", "Explained fixes simply to non-technical users"],
  },
  "ui-ux-designer": {
    strengths: ["User Interface Design", "User Experience Design", "Wireframing", "Prototyping", "User Research", "Design Systems", "Usability Testing", "Responsive Design"],
    bullets: ["Designed screens for web and mobile apps in Figma", "Made wireframes and clickable prototypes", "Spoke with users to understand their needs and problems", "Built a design system of reusable components", "Ran usability tests and improved designs from feedback", "Worked with developers to make sure designs were built correctly", "Designed responsive layouts for different screen sizes", "Created user flows that make tasks simple and quick"],
  },
  "graphic-designer": {
    strengths: ["Visual Design", "Brand Identity", "Social Media Creatives", "Print Design", "Typography", "Layout Design", "Photo Editing", "Creative Concepts"],
    bullets: ["Designed social media posts, banners and ads", "Created logos and brand material for clients", "Designed brochures, flyers and other print material", "Edited and retouched photos", "Followed brand guidelines for colours, fonts and style", "Handled several projects at once and met deadlines", "Turned client feedback into better designs", "Prepared print-ready and web-ready files"],
  },
  "digital-marketing": {
    strengths: ["Search Engine Optimisation (SEO)", "Social Media Marketing", "Paid Advertising (PPC)", "Content Marketing", "Campaign Management", "Analytics & Reporting", "Keyword Research", "Lead Generation"],
    bullets: ["Planned and posted content on social media pages", "Ran ad campaigns on Google and Meta", "Did keyword research and on-page SEO for the website", "Tracked website traffic and results in Google Analytics", "Wrote ad copy and captions", "Grew followers and engagement on social media", "Made monthly reports on campaign results", "Built email campaigns to bring back customers"],
  },
  "content-writer": {
    strengths: ["Content Writing", "Copywriting", "SEO Writing", "Research", "Editing & Proofreading", "Content Strategy", "Blog Writing", "Social Media Content"],
    bullets: ["Wrote blogs, articles and website pages", "Researched topics to write accurate content", "Wrote SEO-friendly content using target keywords", "Edited and proofread content for grammar and clarity", "Wrote social media posts and ad copy", "Followed brand tone and style guides", "Met regular publishing deadlines", "Updated old content to improve search rankings"],
  },
  "sales-executive": {
    strengths: ["Sales & Business Development", "Lead Generation", "Client Relationship Management", "Negotiation", "Target Achievement", "Product Presentation", "Market Research", "CRM Management"],
    bullets: ["Found new customers through calls, visits and referrals", "Explained products clearly and answered customer questions", "Followed up with leads and converted them into sales", "Built good relationships with regular customers", "Worked towards monthly sales targets", "Kept customer details and follow-ups updated in the CRM", "Prepared daily and weekly sales reports", "Collected market feedback and shared it with the team"],
  },
  "marketing-executive": {
    strengths: ["Marketing Strategy", "Campaign Planning", "Brand Promotion", "Market Research", "Event Management", "Social Media Marketing", "Lead Generation", "Marketing Reports"],
    bullets: ["Planned and ran marketing campaigns", "Organised events, promotions and product launches", "Did market research on customers and competitors", "Created marketing material with the design team", "Managed social media posts and promotions", "Generated leads for the sales team", "Tracked campaign results and shared reports", "Worked with vendors and agencies on promotions"],
  },
  accountant: {
    strengths: ["Bookkeeping", "Accounts Payable & Receivable", "GST Compliance", "TDS", "Bank Reconciliation", "Financial Reporting", "Invoice Management", "Ledger Maintenance"],
    bullets: ["Recorded daily sales, purchase and expense entries in Tally", "Prepared and checked invoices and bills", "Reconciled bank statements with the books", "Helped prepare GST returns and TDS records", "Maintained ledgers for customers and vendors", "Followed up on pending payments", "Prepared monthly reports for management", "Kept financial records accurate and ready for audit"],
  },
  "hr-executive": {
    strengths: ["Recruitment & Selection", "Candidate Sourcing", "Interview Coordination", "Employee Onboarding", "HR Operations", "Payroll Support", "Employee Engagement", "HR Documentation"],
    bullets: ["Posted job openings on Naukri, LinkedIn and other job portals", "Screened resumes and shortlisted candidates", "Scheduled interviews and coordinated with hiring managers", "Handled offer letters and joining formalities", "Onboarded new employees and explained company policies", "Maintained employee records and attendance", "Supported monthly payroll processing", "Organised employee engagement activities"],
  },
  "customer-support": {
    strengths: ["Customer Service", "Complaint Resolution", "Inbound & Outbound Calls", "Chat & Email Support", "CRM Management", "Active Listening", "Escalation Handling", "Customer Satisfaction"],
    bullets: ["Handled customer calls, chats and emails", "Solved customer problems quickly and politely", "Recorded customer details and issues in the CRM", "Escalated complex issues to the right team", "Followed up to make sure problems were solved", "Met daily targets for calls and response time", "Explained products and services clearly", "Kept good customer satisfaction ratings"],
  },
  "office-admin": {
    strengths: ["Office Administration", "Data Entry & Management", "Record Keeping", "MS Office", "Scheduling & Coordination", "Front Desk Management", "Email & Correspondence", "Vendor Coordination"],
    bullets: ["Entered and updated data accurately in Excel and company software", "Maintained files, records and documents", "Managed calls, emails and visitors at the front desk", "Scheduled meetings and managed calendars", "Prepared letters, reports and presentations", "Tracked office supplies and ordered stock", "Coordinated with vendors and service providers", "Supported different teams with daily office work"],
  },
  teacher: {
    strengths: ["Lesson Planning", "Classroom Management", "Student Assessment", "Curriculum Delivery", "Online Teaching", "Student Engagement", "Parent Communication", "Activity-Based Learning"],
    bullets: ["Planned and delivered lessons according to the syllabus", "Explained concepts with examples and activities", "Prepared tests and tracked students' progress", "Gave extra help to students who needed it", "Managed the classroom and kept students engaged", "Took online classes using digital tools", "Met parents to discuss students' progress", "Organised school events and activities"],
  },
  "mechanical-engineer": {
    strengths: ["Production & Manufacturing", "Preventive Maintenance", "CAD Design", "Quality Control", "Root Cause Analysis", "Lean Manufacturing", "Safety Compliance", "Technical Drawings"],
    bullets: ["Supported daily production on the shop floor", "Carried out preventive maintenance on machines", "Made 2D and 3D drawings in AutoCAD / SolidWorks", "Checked parts and products for quality", "Found the cause of machine problems and fixed them", "Helped reduce waste and improve output", "Followed safety rules and standard procedures", "Kept maintenance and production records"],
  },
  "civil-engineer": {
    strengths: ["Site Execution", "Quantity Estimation", "AutoCAD Drafting", "Project Planning", "Quality Control", "Site Supervision", "Billing & Measurement", "Safety Compliance"],
    bullets: ["Supervised daily work on site", "Read drawings and made sure work matched them", "Prepared quantity estimates and bar bending schedules", "Took measurements and prepared bills", "Checked the quality of materials and work", "Made drawings in AutoCAD", "Coordinated with contractors and labour teams", "Kept daily site reports and progress records"],
  },
  "electrical-engineer": {
    strengths: ["Electrical Maintenance", "Circuit Design", "PLC Programming", "Testing & Troubleshooting", "Panel Wiring", "Electrical Safety", "Embedded Systems", "Technical Documentation"],
    bullets: ["Maintained and repaired electrical equipment", "Tested circuits and found faults", "Worked on PLC programs and control panels", "Prepared wiring and circuit drawings", "Followed electrical safety rules on site", "Built and tested embedded / microcontroller projects", "Kept maintenance and testing records", "Helped install new electrical systems"],
  },
  "operations-executive": {
    strengths: ["Operations Management", "Inventory Control", "Supply Chain Coordination", "Vendor Management", "Order Processing", "Logistics Planning", "Process Improvement", "MIS Reporting"],
    bullets: ["Managed daily orders from receipt to dispatch", "Tracked stock levels and updated inventory records", "Coordinated with vendors and transporters", "Raised purchase orders and followed up on delivery", "Solved delays in orders and deliveries", "Prepared daily and monthly operations reports", "Maintained documents for goods in and out", "Suggested process changes that saved time"],
  },
  "business-analyst": {
    strengths: ["Requirement Gathering", "Business Process Analysis", "Documentation (BRD / FRD)", "Stakeholder Communication", "User Stories", "Data Analysis", "Process Mapping", "Agile Methodology"],
    bullets: ["Gathered requirements from clients and internal teams", "Wrote BRDs, user stories and acceptance criteria", "Mapped current and future business processes", "Worked between business teams and developers", "Analysed data to support decisions", "Took part in sprint planning and review meetings", "Tested features against requirements", "Prepared reports and presentations for stakeholders"],
  },
};

/** Offered for every job, next to the role's own strengths. */
export const GENERAL_STRENGTHS = ["Communication", "Teamwork", "Problem Solving", "Time Management", "Quick Learner", "Attention to Detail", "Adaptability", "Leadership"];

/*
 * Skill groups for the "Technical Skills" section; ATS software reads grouped skills well.
 * Matching ignores case, spaces and dots ("react js" = "React.js" = "React"). Unknown skills go under "Other Skills".
 */
export const SKILL_GROUPS = {
  "Programming Languages": ["C", "C++", "Java", "Core Java", "Python", "JavaScript", "JS", "TypeScript", "C#", "PHP", "Kotlin", "Swift", "Dart", "Go", "Ruby", "R", "Bash", "Embedded C", "MATLAB"],
  Frontend: ["HTML", "HTML5", "CSS", "CSS3", "React", "React JS", "Next.js", "Angular", "Vue", "Tailwind CSS", "Tailwind", "Bootstrap", "Redux", "jQuery", "Responsive Design", "SASS"],
  Backend: ["Node.js", "Node", "Express", "Express.js", "Django", "Flask", "FastAPI", "Spring Boot", "Spring", "Hibernate", "Laravel", ".NET", "ASP.NET", "REST API", "REST APIs", "Microservices", "JDBC", "GraphQL"],
  Databases: ["SQL", "MySQL", "MongoDB", "PostgreSQL", "Firebase", "Oracle", "SQLite", "Redis", "SQL Server"],
  Mobile: ["Android", "iOS", "Flutter", "React Native", "Jetpack Compose", "SwiftUI"],
  "Cloud & DevOps": ["AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Jenkins", "CI/CD", "Terraform", "Linux", "Nginx", "Vercel", "Netlify"],
  "Data & AI": ["Pandas", "NumPy", "Scikit-learn", "TensorFlow", "PyTorch", "Machine Learning", "Deep Learning", "NLP", "Statistics", "Power BI", "Tableau", "Data Visualization", "Data Visualisation", "Data Analysis", "OpenCV", "Generative AI"],
  "Developer Tools": ["Git", "GitHub", "GitLab", "JIRA", "Postman", "Maven", "VS Code", "Selenium", "Manual Testing", "Automation Testing", "API Testing", "Test Cases", "SDLC", "STLC", "Data Structures", "Algorithms", "OOP"],
  "Design Tools": ["Figma", "Adobe XD", "Photoshop", "Illustrator", "CorelDRAW", "InDesign", "Canva", "After Effects", "Premiere Pro", "Wireframing", "Prototyping", "Typography", "Branding"],
  "Engineering Tools": ["AutoCAD", "AutoCAD Electrical", "SolidWorks", "CATIA", "Creo", "ANSYS", "STAAD Pro", "Revit", "MS Project", "Primavera", "PLC", "SCADA", "Arduino", "GD&T", "PCB Design", "Microcontrollers"],
  "Accounting & Finance": ["Tally", "Tally Prime", "Tally ERP 9", "GST", "TDS", "Income Tax", "Busy", "Zoho Books", "Bookkeeping", "Accounts Payable", "Accounts Receivable", "Bank Reconciliation"],
  "Marketing Tools": ["SEO", "Google Ads", "Meta Ads", "Google Analytics", "WordPress", "Social Media Marketing", "Content Marketing", "Email Marketing", "Keyword Research"],
  "Office & Business Tools": ["MS Office", "MS Excel", "Excel", "Advanced Excel", "MS Word", "MS PowerPoint", "PowerPoint", "Google Sheets", "Office 365", "SAP", "ERP", "CRM", "Naukri", "Pivot Tables", "VLOOKUP", "Data Entry", "Typing"],
  "Soft Skills": ["Communication", "Teamwork", "Leadership", "Problem Solving", "Time Management", "Negotiation", "Presentation", "Customer Service", "Critical Thinking", "Adaptability", "Attention to Detail", "Quick Learner"],
};
