const AGENT_LINKS = {
  request: "https://wj.qq.com/s2/26765122/e267/",
  home: "./index.html",
  trust: "./trust.html",
  education: "./education.html",
  services: "./services.html",
  licensing: "./licensing.html",
  samples: "./cases/sample-data.html",
  cases: "./cases/test-series.html",
  youth: "./cases/youth-creator.html",
  archive: "./spatial-archive.html",
  gallery: "./virtual-gallery.html",
};

const STYLE_LABELS = {
  direct: "项目说明",
  wechat: "沟通建议",
  onsite: "现场咨询",
  triage: "判断建议",
};

const COMMON_COLLECT = [
  "你是谁：艺术家 / 家长 / 教育机构 / 展览空间 / 普通访客。",
  "你想做什么：展示样本、课程成果、礼品文创、空间装置、授权销售或项目演示。",
  "数量和时间：单件、少量样本、班级批量，预计什么时候需要交付。",
  "权属边界：作品作者、是否有监护人或权利方确认、是否允许公开展示或销售。",
];

const AGENT_KNOWLEDGE = [
  {
    id: "definition",
    title: "元维构是什么",
    category: "项目定义",
    keywords: ["元维构", "项目", "做什么", "介绍", "是什么", "平台", "metrion", "3d打印", "区别", "不同", "普通打印店", "打印店", "结构转译"],
    summary:
      "元维构 METRION 是一个艺术结构转译与数字档案平台。它把已有的二维作品、插画、青少年创作、馆藏图像或空间想法，转译成可展示、可收藏、可包装、可建立授权边界的三维结构资产。",
    bullets: [
      "它不是普通 3D 打印店。普通打印店通常接收模型并生产物件，元维构先判断作品语境、结构潜力、展示用途、版权状态和后续运营可能。",
      "交付不只是一件模型，而是一套从作品判断、结构转译、实体样本、说明卡、二维码档案到授权边界记录的流程。",
      "项目的核心表达是：让已有作品进入现实空间，并保留作品来源、作者关系和使用边界。",
    ],
    templates: {
      direct: [
        "可以把元维构理解为“艺术作品进入三维空间的转译系统”。",
        "如果你有一张画、一个图像、一个儿童创作或一件平面作品，我们先判断它是否适合被转译，再决定做成浮雕、立体摆件、空间装置、AR 展示或文创样本。",
      ],
      wechat: [
        "我们不是直接按图打印，而是先帮你判断这件作品适不适合做成立体版本。",
        "适合的话，会继续设计结构、尺寸、材质、展示方式和二维码档案；如果涉及销售或公开展示，也会单独确认授权边界。",
      ],
      onsite: [
        "一句话说，元维构是把画面变成可展示、可收藏、可扫码了解的三维作品。",
        "你现在看到的样本不是单纯打印件，而是作品转译、档案记录和展示系统的一部分。",
      ],
    },
    collect: COMMON_COLLECT,
    links: [
      ["官网首页", AGENT_LINKS.home],
      ["可信转译原则", AGENT_LINKS.trust],
      ["36组样本数据", AGENT_LINKS.samples],
    ],
    followups: ["元维构和普通3D打印店有什么区别？", "我有一张画，能不能做成立体作品？", "这个项目适合哪些客户？"],
  },
  {
    id: "difference",
    title: "和普通 3D 打印、建模服务的区别",
    category: "差异说明",
    keywords: ["元维构和普通3d打印店有什么区别", "和普通3d打印店有什么区别", "普通3d打印店", "3d打印", "建模", "普通", "打印店", "区别", "为什么找你", "为什么不是", "淘宝", "工厂", "代工", "打印服务"],
    summary:
      "元维构和普通 3D 打印最大的区别，是服务对象不是“已有模型”，而是“已有作品”。它解决的是作品如何被合理转译、展示、归档和授权，而不只是生产一个物件。",
    bullets: [
      "普通打印服务关注模型文件、材料、精度和价格；元维构关注原作结构、语义保留、展示场景、样本档案和权属边界。",
      "普通建模通常按客户指令做形体；元维构会先判断这件作品是否值得转译，以及应该转译成什么形态。",
      "对教育机构、展览空间和创作者来说，元维构更像一套作品转译与展示流程，而不是一次性加工。",
    ],
    templates: {
      direct: [
        "如果你已经有成熟 3D 文件，只需要生产，那可以找普通打印服务。",
        "如果你手里是画、插画、儿童作品、艺术图像或展览内容，并且希望它变成可展示、可讲述、可建档、可继续授权的三维资产，就更适合元维构。",
      ],
      wechat: [
        "简单说，打印店是“你给模型，我帮你打出来”。",
        "元维构是“你给作品，我们先判断怎么转译，再做样本、展示、档案和授权边界”。所以它更适合艺术、教育、展览和文创项目。",
      ],
    },
    collect: ["原始内容是图片、手稿、绘画、IP 图像，还是已经完成的 3D 文件？", "你需要的是生产一件物品，还是建立一套可展示、可归档、可复用的作品资产？"],
    links: [
      ["服务与价格", AGENT_LINKS.services],
      ["可信转译原则", AGENT_LINKS.trust],
    ],
    followups: ["普通打印店能不能做这个？", "元维构的核心壁垒是什么？", "转译完成后我能拿到什么？"],
  },
  {
    id: "education",
    title: "教育机构与儿童画批量合作",
    category: "教育合作",
    keywords: ["教育", "机构", "少儿", "儿童画", "学生", "学校", "画室", "班级", "批量", "家长", "亲子", "30个", "30 个", "课程", "美术机构", "校区"],
    summary:
      "儿童画和青少年作品适合做课程成果、家庭纪念、机构展示、亲子活动和学期成果展。机构合作通常从 1-3 件代表样本开始，再扩展到班级批量。",
    bullets: [
      "机构样本包适合先选 1-3 件代表作品，验证风格、尺寸、家长反馈、包装和展示方式。",
      "班级成果包适合 20 人以上课程、节日活动、学期展、亲子工作坊和校区展示。",
      "儿童与青少年作品需要确认图片提交、制作、展示、宣传和销售边界，公开销售不默认开放。",
      "机构最适合建立统一交付表：学生姓名或编号、作品标题、尺寸、材质、包装、是否公开展示、是否授权销售。",
    ],
    templates: {
      direct: [
        "如果是 30 个学生，建议先做“1-3 件机构样本”，确认转译风格、尺寸、包装和家长接受度。",
        "样本通过后，再把班级作品整理成统一数据表，按编号进入批量制作和交付。",
      ],
      wechat: [
        "可以做。建议先从 1-3 件代表作品打样，让机构和家长看到最终效果。",
        "确认风格后，再按班级批量整理作品、学生信息、尺寸、包装和展示方式。儿童作品如果要公开展示或销售，需要监护人确认。",
      ],
      onsite: [
        "教育机构可以把学生作品做成立体课程成果，用于校区展、亲子活动和毕业礼。",
        "现场可以先扫码提交 1-3 件样本，我们会判断作品是否适合转译。",
      ],
    },
    collect: [
      "机构名称、城市、校区数量和联系人。",
      "学生数量、作品类型、是否同一主题课程。",
      "希望交付的形式：单件摆件、挂卡、亲子礼品、校区展览、课程成果包。",
      "是否允许官网、展会或机构宣传中展示学生作品。",
      "是否需要家长授权说明、二维码档案和统一包装。",
    ],
    caution: "儿童作品涉及监护人确认。用于课程展示、机构宣传、公开销售是不同授权边界，需要分开确认。",
    links: [
      ["教育机构专页", AGENT_LINKS.education],
      ["青少年案例", AGENT_LINKS.youth],
      ["提交机构样本判断", AGENT_LINKS.request],
    ],
    followups: ["30个学生批量合作怎么开始？", "儿童作品授权怎么处理？", "机构合作大概多少钱？"],
  },
  {
    id: "parent",
    title: "家长与儿童作品纪念",
    category: "家长咨询",
    keywords: ["家长", "孩子", "儿童画", "纪念", "生日", "礼物", "亲子", "学生作品", "小朋友", "我的孩子", "家庭"],
    summary:
      "家长咨询通常关心三件事：孩子的画能不能立体化、成品能否保留原画感觉、价格和交付周期是否适合家庭纪念。",
    bullets: [
      "适合优先选择主体清晰、色彩关系明确、孩子表达有特点的作品。",
      "家庭纪念不一定追求复杂结构，重点是保留孩子作品的情绪、轮廓和识别度。",
      "可做成桌面摆件、挂卡、礼品盒、二维码档案或亲子展览小样。",
    ],
    templates: {
      wechat: [
        "可以先发 1-3 张孩子作品照片，我们会判断哪一张更适合做成立体纪念。",
        "一般会看主体是否清楚、层次是否明显、颜色和轮廓是否有识别度。适合的话，再确定尺寸、材质、包装和交付时间。",
      ],
      direct: [
        "家长用户建议先做单件纪念样本，不需要一开始就追求复杂结构。",
        "如果作品效果好，可以继续扩展成家庭收藏、亲子活动成果或机构课程样本。",
      ],
    },
    collect: [
      "孩子作品照片 1-3 张，尽量正面拍摄、光线清晰。",
      "孩子年龄、作品标题或孩子自己的描述。",
      "用途：家庭纪念、礼物、课程成果、展览展示。",
      "希望尺寸、预算区间和是否需要包装。",
    ],
    caution: "孩子作品默认只做家庭或课程用途；公开展示、宣传或销售要由监护人确认。",
    links: [
      ["提交作品判断", AGENT_LINKS.request],
      ["青少年案例", AGENT_LINKS.youth],
    ],
    followups: ["孩子的画适合做成立体纪念吗？", "家长需要提供什么资料？", "可以做成礼物吗？"],
  },
  {
    id: "artwork",
    title: "作品是否适合转译",
    category: "作品判断",
    keywords: ["适合", "能不能做", "我的作品", "上传", "判断", "转译", "立体", "模型", "浮雕", "雕塑", "图片", "作品图", "可行性", "源文件"],
    summary:
      "作品是否适合转译，需要看主体、层次、空间节奏、角色结构、色彩关系、制作难度和版权状态。咨询助手可以做初步说明，最终判断需要看作品图和用途。",
    bullets: [
      "更适合的作品通常有明确主体、层次关系、空间节奏、角色结构或装饰框架。",
      "过于抽象、细节极碎、主体不清或版权状态不明的图像，需要先做可行性判断。",
      "请准备 1-3 张清晰作品图，并说明作者、来源、用途、期望尺寸、是否公开展示、是否进入销售。",
      "涉及版权、授权销售和最终报价时，元维构会人工确认，不由咨询助手直接定结论。",
    ],
    templates: {
      direct: [
        "初步判断可以从四个问题开始：画面有没有明确主体？有没有可分层的结构？完成后用于展示还是销售？权属是否清楚？",
        "如果这四点都比较清晰，就值得进入作品判断表单。",
      ],
      triage: [
        "请按这个顺序提交：作品图、作者/来源、用途、期望尺寸、是否公开展示、是否销售、是否有源文件。",
        "我们会先判断适合做浮雕、半立体、完整立体、挂卡、装置，还是只适合做数字档案展示。",
      ],
      wechat: [
        "可以先发作品图，我们会先看是否适合转译。",
        "主要看主体是否清楚、层次是否能拆分、做成立体后是否还有作品识别度，以及版权和用途是否明确。",
      ],
    },
    collect: [
      "作品图：正面清晰图，最好 1-3 张。",
      "作品信息：作者、标题、年份或来源。",
      "用途：收藏、展览、礼品、课程成果、文创销售或空间装置。",
      "权属：你是否拥有制作、展示、宣传或销售授权。",
      "交付偏好：尺寸、材质、颜色、包装、二维码档案、是否需要 AR/网页模型。",
    ],
    caution: "这是高风险判断：咨询助手只能给初步方向，不能替代作品实图判断、权属核验和最终报价。",
    links: [
      ["提交作品转译判断", AGENT_LINKS.request],
      ["可信转译流程", AGENT_LINKS.trust],
    ],
    followups: ["什么样的画更适合转译？", "需要提供源文件吗？", "不适合转译的作品有哪些？"],
  },
  {
    id: "workflow",
    title: "合作流程与交付步骤",
    category: "流程",
    keywords: ["流程", "怎么开始", "步骤", "多久", "周期", "交付", "怎么合作", "先做什么", "下一步", "打样", "定制"],
    summary:
      "标准流程是：提交作品或合作需求、初步判断、确认方案与报价、结构转译、样本制作、展示与档案交付、必要时进入授权或批量合作。",
    bullets: [
      "第一步不是付款制作，而是确认作品是否适合转译、适合什么形态、用途和权属是否清楚。",
      "单件样本通常先确认尺寸、材质、展示方式和是否需要二维码档案。",
      "批量合作需要先整理数据表，再进入排期、打样、确认、制作和交付。",
      "展览、教育机构和授权销售项目会多一步：确认公开展示、宣传使用和销售边界。",
    ],
    templates: {
      direct: [
        "合作可以按 6 步走：提交资料、可行性判断、方案报价、结构转译、样本制作、档案与展示交付。",
        "如果是机构批量，会先增加“样本验证”和“统一数据表”两个环节。",
      ],
      wechat: [
        "你可以先提交作品图和用途，我们先做初步判断。",
        "适合的话，再确认尺寸、材质、数量、包装和交付周期。涉及公开展示或销售的，会再确认授权边界。",
      ],
    },
    collect: COMMON_COLLECT,
    links: [
      ["提交作品判断", AGENT_LINKS.request],
      ["服务与价格", AGENT_LINKS.services],
    ],
    followups: ["从提交到交付要多久？", "批量合作流程是什么？", "我现在应该先发什么资料？"],
  },
  {
    id: "pricing",
    title: "服务与价格",
    category: "价格",
    keywords: ["价格", "多少钱", "报价", "费用", "收费", "预算", "套餐", "服务", "交付", "贵不贵", "单价", "批量价格"],
    summary:
      "元维构先判断作品是否适合转译，再根据尺寸、涂装、材料、交付形式、数量和版权授权范围制定方案。官网价格是参考区间，最终以项目方案为准。",
    bullets: [
      "作品转译判断：可免费提交；深度书面方案 199 元起。",
      "标准结构样本：约 1500-3800 元/件，适合做第一件转译样本。",
      "完成展示版：约 4800-12800 元/件，适合展览、收藏展示、文创样品和礼品定制。",
      "教育机构批量：约 299-880 元/人，按人数、尺寸、包装、复杂度和交付周期确认。",
    ],
    templates: {
      direct: [
        "价格不能只按图片报价，因为同一张图可能被转译成浮雕、摆件、挂卡、装置或数字展示。",
        "建议先提交作品判断，再根据用途选择样本、展示版或批量方案。",
      ],
      wechat: [
        "可以先免费提交作品判断。我们会看作品适不适合做、适合做成什么形态，再给方案和报价。",
        "如果只是单件样本，一般会从标准结构样本开始；如果是机构批量，会按人数、尺寸和包装来算。",
      ],
    },
    collect: [
      "作品数量与类型。",
      "希望尺寸、材料、颜色和包装。",
      "是单件样本、展览展示版，还是教育机构批量。",
      "是否需要二维码档案、AR/MR 预览或授权销售。",
      "预算区间和交付时间。",
    ],
    caution: "咨询助手给的是官网参考区间；最终报价需要根据作品复杂度、尺寸、材料、数量和授权边界人工确认。",
    links: [
      ["服务与价格", AGENT_LINKS.services],
      ["提交作品判断", AGENT_LINKS.request],
    ],
    followups: ["教育机构批量大概多少钱？", "单件样本怎么报价？", "价格里包含二维码档案吗？"],
  },
  {
    id: "rights",
    title: "版权、授权与销售边界",
    category: "权属",
    keywords: ["版权", "授权", "商用", "销售", "卖", "权属", "原作者", "监护人", "公共领域", "源文件", "模型文件", "合同", "分成", "ip", "侵权", "署名"],
    summary:
      "元维构不替代原作版权，也不因为完成转译就默认开放商业授权。公开展示、教育使用、实体生产、数字模型展示和第三方授权需要分开确认。",
    bullets: [
      "原作版权仍归艺术家、创作者、监护人、收藏者或合法权利方。",
      "研究展示、一次性服务、公开销售、空间装置、教育课程和第三方授权必须分开确认。",
      "公开网页和 AR/MR 演示使用轻量预览模型，源质量生产模型不公开放置。",
      "当代艺术家、IP 形象、儿童作品和网络图像进入销售前，都需要权利方或监护人确认。",
    ],
    templates: {
      direct: [
        "可以制作，不等于可以销售；可以展示，不等于可以授权第三方继续使用。",
        "元维构会把制作、展示、宣传、销售、模型公开程度拆开记录，避免把不同权利混在一起。",
      ],
      wechat: [
        "版权这块我们会分开确认：你是否有权提交制作、是否允许公开展示、是否允许宣传、是否允许销售。",
        "如果只是私人纪念，边界相对简单；如果要销售或给第三方使用，就需要单独确认授权。",
      ],
    },
    collect: [
      "原作者或作品权利方是谁。",
      "提交人是否有制作、展示、宣传、销售授权。",
      "是否涉及儿童作品、当代艺术家、品牌 IP 或网络图片。",
      "是否需要公开网页、AR 展示、授权销售或第三方渠道合作。",
      "是否允许保留样本进入元维构案例库。",
    ],
    caution: "咨询助手不能提供法律结论。具体授权、销售、分成和合同条款需要由权利方与项目负责人确认。",
    links: [
      ["可信转译与FAQ", AGENT_LINKS.trust],
      ["授权与分成", AGENT_LINKS.licensing],
    ],
    followups: ["我的作品可以销售吗？", "儿童画公开展示需要什么授权？", "模型文件会不会公开？"],
  },
  {
    id: "samples",
    title: "36组样本数据表的用途",
    category: "样本库",
    keywords: ["36", "样本", "数据表", "案例库", "测试系列", "编号", "档案", "授权池", "展签", "二维码", "运营字段", "sample"],
    summary:
      "36 组样本数据表是元维构的案例资产索引。它把每个样本变成可检索、可报价、可展签、可二维码归档、可判断授权可能性的运营数据。",
    bullets: [
      "它证明项目不是只有单件模型，而是已经形成可检索、可展示、可运营的样本库。",
      "样本表可服务报价、展签、二维码档案、授权池、教育机构样本包和展览沟通。",
      "每个样本都应记录编号、作品来源、转译类型、用途、数量、尺寸、材质、包装、源文件状态、公开展示状态和授权销售状态。",
      "当代作品、经典作品、青少年创作分别有不同公开展示和授权销售路径。",
    ],
    templates: {
      direct: [
        "这张表现在不是规划，而是第一阶段运营底表。",
        "用户看到它，应理解为：元维构已经把样本整理成可报价、可展签、可扫码建档、可判断授权可能性的确定结果。",
      ],
      onsite: [
        "展会现场可以用样本编号快速讲解：这件作品来自哪里、被转译成什么、适合什么场景、是否可公开展示或授权销售。",
      ],
    },
    collect: [
      "新增样本编号、作品标题、作者/来源。",
      "转译类型：儿童画、经典艺术、当代图像、空间装置、文创样本。",
      "交付字段：尺寸、材质、颜色、包装、数量、是否有源文件。",
      "运营字段：是否可公开展示、是否可授权销售、是否有二维码档案、是否适合教育或展览场景。",
    ],
    links: [
      ["36组样本数据表", AGENT_LINKS.samples],
      ["测试系列案例库", AGENT_LINKS.cases],
    ],
    followups: ["样本数据表怎么服务报价？", "什么是授权池？", "展会现场可以了解哪些样本？"],
  },
  {
    id: "exhibition",
    title: "展会扫码与现场咨询",
    category: "展会",
    keywords: ["展会", "现场", "扫码", "展示区", "观众", "二维码", "展览", "导览", "讲解", "路演", "展台", "打印二维码"],
    summary:
      "展会现场可以让观众扫码进入官网或项目咨询助手，直接询问项目、样本、教育合作、价格、版权和作品提交方式。",
    bullets: [
      "静态二维码适合引导进入官网主页；咨询助手二维码适合让观众现场问答。",
      "观众可以问“这个项目是做什么的”“我有作品能做吗”“教育机构怎么合作”等问题。",
      "咨询助手会把问题导向样本数据、可信原则、教育专页和作品判断表单。",
      "展示区适合放三类二维码：首页总入口、咨询助手入口、提交作品判断入口。",
    ],
    templates: {
      onsite: [
        "你可以直接扫码问项目问题，也可以提交自己的作品让我们判断是否适合转译。",
        "如果你是机构、展览空间或课程负责人，建议留下机构类型、数量、用途和联系方式，我们会按场景回复。",
      ],
      direct: [
        "展会使用时，咨询助手的目标不是替代人工洽谈，而是先完成基础解释、分流和留资。",
        "人工可以把时间留给高价值问题：具体作品、合作数量、授权销售、展览项目和机构合作。",
      ],
      wechat: [
        "你可以把这个页面二维码发给对方，让他先自己问项目问题。",
        "如果对方问到具体作品、报价或版权，就引导他提交作品判断或预约人工沟通。",
      ],
    },
    collect: [
      "观众身份：个人创作者、家长、教育机构、展览空间或普通访客。",
      "咨询目的：了解项目、提交作品、批量合作、现场采购、授权销售或展览合作。",
      "可留下：联系方式、作品数量、预计时间、是否需要回访。",
    ],
    links: [
      ["官网首页", AGENT_LINKS.home],
      ["提交作品判断", AGENT_LINKS.request],
      ["样本数据表", AGENT_LINKS.samples],
    ],
    followups: ["展会扫码后可以了解什么？", "观众可以提交自己的作品吗？", "二维码应该放哪几个入口？"],
  },
  {
    id: "ar",
    title: "数字档案、AR/MR 与虚拟展厅",
    category: "数字展示",
    keywords: ["ar", "mr", "3d", "glb", "虚拟展厅", "数字档案", "二维码档案", "模型查看", "手机", "空间档案", "webxr", "预览", "扫一扫"],
    summary:
      "元维构可以把作品转译结果整理成数字档案、网页 3D 模型、AR/MR 预览和虚拟展厅入口，用于展览导览、机构展示、授权沟通和远程演示。",
    bullets: [
      "公开页面使用轻量预览模型，适合手机访问和网页加载。",
      "空间数字档案记录原作信息、转译说明、实拍记录、模型预览和权属边界。",
      "虚拟展厅适合美术馆、画廊、艺术节、商业展示空间和远程导览。",
      "二维码档案让每件实体样本都能连接到它的来源、转译说明和展示记录。",
    ],
    templates: {
      direct: [
        "数字档案不是额外装饰，而是让样本可被追踪、讲解和再次使用。",
        "一个样本如果只有实体，很难被远程传播；有二维码档案后，它就能进入官网、展会和授权沟通。",
      ],
      onsite: [
        "你可以扫码看到作品来源、转译说明和模型预览。",
        "如果空间允许，还可以继续做 AR/MR 展示或虚拟展厅导览。",
      ],
    },
    collect: [
      "是否需要公开网页模型，还是只做内部查看。",
      "是否需要二维码档案、AR/MR 预览或虚拟展厅。",
      "公开页面可展示哪些信息：作者、标题、转译说明、模型预览、联系方式。",
      "源质量模型是否需要保密。",
    ],
    caution: "公开展示建议使用轻量预览模型；生产级源文件和高质量模型不建议公开放置。",
    links: [
      ["空间数字档案", AGENT_LINKS.archive],
      ["虚拟展厅", AGENT_LINKS.gallery],
    ],
    followups: ["二维码档案包含什么？", "模型文件会公开吗？", "虚拟展厅适合哪些场景？"],
  },
  {
    id: "manufacturing",
    title: "材料、尺寸、包装与成品形式",
    category: "制作交付",
    keywords: ["材料", "材质", "尺寸", "大小", "颜色", "涂装", "包装", "成品", "摆件", "挂卡", "浮雕", "装置", "质量", "耐用", "生产", "交付形式"],
    summary:
      "元维构的成品形式可以是浮雕、半立体摆件、完整立体物、挂卡、空间装置、礼品包装或展示样本。具体形式由作品结构、预算、用途和交付周期决定。",
    bullets: [
      "儿童画、插画和经典作品常见形态是浮雕、挂卡、桌面摆件和礼品盒。",
      "展览或空间项目更适合放大尺寸、强化结构和展示底座。",
      "包装不是附属品，它会影响样本是否适合送礼、销售、机构展示或展会陈列。",
      "尺寸越大、颜色越复杂、表面处理越精细，成本和周期通常越高。",
    ],
    templates: {
      direct: [
        "成品形式不应该先定死，而应该根据作品判断选择。",
        "如果目的是教育批量，建议控制尺寸和包装；如果目的是展览展示，可以优先考虑视觉冲击和结构完整度。",
      ],
      wechat: [
        "可以做成摆件、浮雕、挂卡、礼品包装或展示样本。",
        "我们会根据作品复杂度、预算和用途建议尺寸与材质，不建议一开始就做过大或过复杂。",
      ],
    },
    collect: [
      "希望成品摆放在哪里：桌面、墙面、展柜、展台、室内空间。",
      "是否需要包装、展签、二维码档案或批量编号。",
      "期望尺寸、预算、颜色复杂度和交付时间。",
    ],
    links: [
      ["服务与价格", AGENT_LINKS.services],
      ["测试系列案例", AGENT_LINKS.cases],
    ],
    followups: ["可以做成什么材质？", "能不能做包装？", "展览版和普通样本有什么区别？"],
  },
  {
    id: "museums",
    title: "美术馆、画廊与空间合作",
    category: "空间合作",
    keywords: ["美术馆", "画廊", "艺术节", "展厅", "空间", "商业空间", "公共教育", "文创", "馆藏", "展览合作", "策展"],
    summary:
      "美术馆、画廊和商业空间适合把元维构用作公共教育、展览衍生、馆藏数字档案、艺术节互动和空间装置合作。",
    bullets: [
      "公共教育：把平面作品转译成可触摸、可讲解、可扫码查看的结构样本。",
      "展览衍生：为展览作品制作限量样本、文创礼品或导览装置。",
      "空间装置：把图像语言转化为适合空间展示的结构节点。",
      "馆藏档案：用二维码和网页模型补充作品来源、转译过程和授权边界。",
    ],
    templates: {
      direct: [
        "空间合作不建议只做单件物品，而应该围绕展览主题建立一组样本和档案。",
        "这会更适合导览、公共教育、文创销售和后续授权沟通。",
      ],
    },
    collect: [
      "空间类型：美术馆、画廊、艺术节、商业空间、学校或社区空间。",
      "合作目的：公共教育、展览衍生、文创销售、导览互动或空间装置。",
      "作品来源和授权状态。",
      "展期、预算、数量、安装条件和是否需要数字档案。",
    ],
    links: [
      ["虚拟展厅", AGENT_LINKS.gallery],
      ["空间数字档案", AGENT_LINKS.archive],
      ["授权与分成", AGENT_LINKS.licensing],
    ],
    followups: ["美术馆可以怎么合作？", "空间项目需要准备什么？", "文创销售怎么处理授权？"],
  },
  {
    id: "lead",
    title: "线索收集与人工跟进",
    category: "人工沟通",
    keywords: ["联系", "怎么联系", "表单", "提交", "预约", "客服", "微信", "自动回复", "留资", "跟进", "咨询", "回访", "电话", "商业模式", "投资", "投资人", "融资", "分成", "合作条款", "渠道", "收益", "收入", "赚钱", "护城河", "壁垒"],
    summary:
      "项目咨询助手适合完成基础解释和线索分流：访客先问问题，再根据身份进入作品判断、教育合作、展览合作或人工跟进。",
    bullets: [
      "普通访客：引导提交作品图、用途和联系方式。",
      "教育机构：收集机构名称、学生数量、课程主题、交付时间和展示用途。",
      "展览或机构合作：收集合作类型、作品数量、场景用途和交付时间。",
      "涉及商业合作、分成或非公开条款时，建议转人工沟通，不在公开页面展开。",
      "展会现场：用二维码完成基础问答，再把高价值咨询导向人工。",
    ],
    templates: {
      direct: [
        "下一步最实用的是把咨询助手的回答和表单连接起来。",
        "用户问完后，如果涉及具体作品、机构批量、报价、授权或合作条款，就引导他提交表单或留下联系方式。",
      ],
      wechat: [
        "你可以先把作品图和用途发过来，或者直接填这个作品判断表。",
        "如果是机构合作，请补充机构名称、学生数量、交付时间和联系人，我们会按批量方案回复。",
      ],
      onsite: [
        "现场扫码后，请选择你的身份：个人作品、教育机构、展览空间或普通访客。",
        "系统会先回答基础问题，具体报价和授权由人工继续确认。",
      ],
    },
    collect: COMMON_COLLECT,
    caution: "当前页面可完成基础回答和咨询分流；涉及微信客服、CRM 或后台 AI 自动跟进时，需要在后续系统中接入。",
    links: [
      ["提交作品判断", AGENT_LINKS.request],
      ["教育机构合作", AGENT_LINKS.education],
      ["服务与价格", AGENT_LINKS.services],
    ],
    followups: ["用户在微信上问我时怎么回复？", "展会留资怎么做？", "咨询助手以后怎么接微信？"],
  },
];

const FALLBACK = {
  title: "我需要更多信息来判断",
  category: "兜底",
  summary:
    "这个问题需要更多上下文。你可以换一种问法，或补充你的身份、作品类型、合作用途、数量、预算、时间和是否公开展示。",
  bullets: [
    "如果是作品咨询：请提供 1-3 张清晰作品图、作者/来源、用途和是否希望销售。",
    "如果是机构合作：请说明学生数量、作品类型、交付时间和展示场景。",
    "如果是授权、销售或合作条款问题：我可以先解释基本边界，具体条款需要项目负责人确认。",
  ],
  templates: {
    direct: [
      "你可以把问题改成更具体的形式，例如：我是谁、手里有什么作品、想做什么用途、需要多少件、是否公开展示或销售。",
      "这样咨询助手可以把问题分流到作品判断、教育合作、版权授权、价格或人工沟通。",
    ],
  },
  collect: COMMON_COLLECT,
  links: [
    ["提交作品判断", AGENT_LINKS.request],
    ["查看FAQ", AGENT_LINKS.trust],
  ],
  followups: ["我有作品，应该先提交什么？", "教育机构怎么开始合作？", "元维构是什么？"],
};

const WELCOME = {
  title: "你好，我是元维构项目咨询助手",
  category: "欢迎",
  summary:
    "我可以按访客、家长、教育机构、展会观众和艺术创作者的不同语境回答。你可以问项目介绍、作品判断、价格、版权、教育批量、样本数据、数字档案、展会扫码和下一步合作。",
  bullets: [
    "低风险问题会直接回答，并给出官网入口。",
    "涉及作品适配、授权销售、源文件、最终报价和合同条款时，会提示提交判断或人工确认。",
    "你可以直接问：我有一张画能不能做成立体作品、教育机构如何合作、展会扫码后能了解什么，或者提交作品前需要准备哪些资料。",
  ],
  templates: {
    direct: [
      "你可以先点上方推荐问题，也可以直接输入真实用户会问的问题。",
      "这个页面适合官网咨询、展会扫码和项目演示使用。",
    ],
  },
  links: [
    ["提交作品判断", AGENT_LINKS.request],
    ["36组样本数据", AGENT_LINKS.samples],
    ["教育机构合作", AGENT_LINKS.education],
  ],
  followups: ["元维构是什么？", "教育机构30个学生怎么合作？", "展会扫码后能了解什么？"],
};

function normalizeText(text) {
  return (text || "").toLowerCase().replace(/\s+/g, "");
}

function detectStyle(question) {
  const q = normalizeText(question);
  if (["微信咨询", "微信联系", "联系微信"].some((word) => q.includes(word))) {
    return "wechat";
  }
  if (["展会", "现场", "扫码", "展台", "观众", "路演"].some((word) => q.includes(word))) {
    return "onsite";
  }
  if (["需要提供", "怎么开始", "资料", "清单", "判断", "提交", "下一步"].some((word) => q.includes(word))) {
    return "triage";
  }
  return "direct";
}

function scoreEntry(question, entry) {
  const q = normalizeText(question);
  let score = 0;

  entry.keywords.forEach((keyword) => {
    const key = normalizeText(keyword);
    if (!key) return;
    if (q.includes(key)) {
      score += Math.max(3, Math.min(12, key.length + 2));
    }
  });

  if (q.includes(normalizeText(entry.title))) score += 8;
  if (entry.category && q.includes(normalizeText(entry.category))) score += 5;
  return score;
}

function uniqueItems(items) {
  return [...new Set(items.filter(Boolean))];
}

function uniqueLinks(links) {
  const seen = new Set();
  return links.filter(([label, href]) => {
    const key = `${label}|${href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectTemplate(entry, style) {
  if (!entry.templates) return [];
  return entry.templates[style] || entry.templates.direct || Object.values(entry.templates)[0] || [];
}

function isBusinessSensitiveQuestion(question) {
  const q = normalizeText(question);
  return ["商业模式", "投资", "投资人", "融资", "护城河", "壁垒", "收益", "收入", "赚钱", "分成"].some((word) => q.includes(word));
}

function findAnswer(question) {
  const style = detectStyle(question);
  if (isBusinessSensitiveQuestion(question)) {
    const lead = AGENT_KNOWLEDGE.find((entry) => entry.id === "lead");
    return { ...lead, style, template: selectTemplate(lead, style) };
  }

  const ranked = AGENT_KNOWLEDGE
    .map((entry) => ({ entry, score: scoreEntry(question, entry) }))
    .sort((a, b) => b.score - a.score);

  if (!ranked[0] || ranked[0].score < 3) {
    return { ...FALLBACK, style, template: selectTemplate(FALLBACK, style) };
  }

  const primary = ranked[0].entry;
  const related = ranked
    .filter((item) => item.score >= 7 && item.entry.id !== primary.id)
    .slice(0, 2)
    .map((item) => item.entry);

  const bullets = uniqueItems([
    ...primary.bullets,
    ...related.flatMap((entry) => entry.bullets.slice(0, 2)),
  ]).slice(0, 8);

  const links = uniqueLinks([
    ...primary.links,
    ...related.flatMap((entry) => entry.links),
  ]).slice(0, 5);

  return {
    ...primary,
    style,
    styleLabel: STYLE_LABELS[style] || STYLE_LABELS.direct,
    template: selectTemplate(primary, style),
    bullets,
    links,
    related: related.map((entry) => entry.title),
    collect: uniqueItems([...(primary.collect || []), ...related.flatMap((entry) => entry.collect || []).slice(0, 3)]).slice(0, 7),
    followups: uniqueItems([...(primary.followups || []), ...related.flatMap((entry) => entry.followups || [])]).slice(0, 5),
    caution: primary.caution || related.find((entry) => entry.caution)?.caution,
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderList(items) {
  if (!items || !items.length) return "";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function answerToHtml(answer) {
  const styleLabel = answer.styleLabel || STYLE_LABELS[answer.style] || STYLE_LABELS.direct;
  const meta = `<div class="agent-answer-meta"><span>${escapeHtml(styleLabel)}</span><span>${escapeHtml(answer.category || "知识库")}</span></div>`;
  const bullets = renderList(answer.bullets || []);
  const template = answer.template?.length
    ? `<div class="agent-template">${answer.template.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`
    : "";
  const collect = answer.collect?.length
    ? `<div class="agent-collect"><strong>为了继续判断，可以补充这些信息</strong>${renderList(answer.collect)}</div>`
    : "";
  const caution = answer.caution ? `<p class="agent-caution">${escapeHtml(answer.caution)}</p>` : "";
  const related = answer.related?.length
    ? `<p class="agent-related">关联判断：${answer.related.map(escapeHtml).join(" / ")}</p>`
    : "";
  const links = (answer.links || [])
    .map(([label, href]) => {
      const external = href.startsWith("http");
      return `<a href="${href}" ${external ? 'target="_blank" rel="noopener"' : ""}>${escapeHtml(label)}</a>`;
    })
    .join("");
  const followups = answer.followups?.length
    ? `<div class="agent-followups">${answer.followups
        .map((prompt) => `<button type="button" data-agent-inline-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`)
        .join("")}</div>`
    : "";

  return `
    ${meta}
    <h3>${escapeHtml(answer.title)}</h3>
    <p>${escapeHtml(answer.summary)}</p>
    ${template}
    ${bullets}
    ${collect}
    ${caution}
    ${related}
    <div class="agent-answer-links">${links}</div>
    ${followups}
  `;
}

function addMessage(container, role, content) {
  const message = document.createElement("article");
  message.className = `agent-message ${role}`;
  message.innerHTML = role === "user" ? `<p>${escapeHtml(content)}</p>` : content;
  container.appendChild(message);
  container.scrollTop = container.scrollHeight;
}

function copyLastAnswer(messages) {
  const answers = [...messages.querySelectorAll(".agent-message.agent")];
  const last = answers.at(-1);
  if (!last) return;
  const text = last.innerText.trim();
  navigator.clipboard?.writeText(text);
}

function submitPrompt(input, form, prompt) {
  input.value = prompt;
  form.requestSubmit();
}

function initAgent() {
  const messages = document.querySelector("[data-agent-messages]");
  const form = document.querySelector("[data-agent-form]");
  const input = document.querySelector("[data-agent-input]");
  const clear = document.querySelector("[data-agent-clear]");
  const prompts = document.querySelectorAll("[data-agent-prompt]");

  if (!messages || !form || !input) return;

  addMessage(messages, "agent", answerToHtml(WELCOME));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    addMessage(messages, "user", question);
    input.value = "";
    const answer = findAnswer(question);
    addMessage(messages, "agent", answerToHtml(answer));
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      form.requestSubmit();
    }
  });

  prompts.forEach((button) => {
    button.addEventListener("click", () => submitPrompt(input, form, button.dataset.agentPrompt || ""));
  });

  messages.addEventListener("click", (event) => {
    const button = event.target.closest("[data-agent-inline-prompt]");
    if (!button) return;
    submitPrompt(input, form, button.dataset.agentInlinePrompt || "");
  });

  clear?.addEventListener("click", () => {
    messages.innerHTML = "";
    addMessage(messages, "agent", answerToHtml(WELCOME));
  });

  messages.addEventListener("dblclick", () => copyLastAnswer(messages));
}

window.MetrionAgent = {
  WELCOME,
  findAnswer,
  answerToHtml,
  escapeHtml,
};

document.addEventListener("DOMContentLoaded", initAgent);
