DO $$
DECLARE
  uid UUID;
  p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID;
  t1 UUID; t2 UUID; t3 UUID; t4 UUID; t5 UUID; t6 UUID; t7 UUID; t8 UUID; t9 UUID; t10 UUID;
  today DATE := CURRENT_DATE;
  yesterday DATE := CURRENT_DATE - 1;
  two_days_ago DATE := CURRENT_DATE - 2;
  six_days_ago DATE := CURRENT_DATE - 6;
  week_ago DATE := CURRENT_DATE - 7;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'stars0114@163.com';
  IF uid IS NULL THEN RAISE EXCEPTION '用户未找到'; END IF;

  DELETE FROM gacha_records WHERE user_id = uid;
  DELETE FROM token_records WHERE user_id = uid;
  DELETE FROM weekly_task_claims WHERE user_id = uid;
  DELETE FROM showcase_snapshots WHERE user_id = uid;
  DELETE FROM gacha_ssr_targets WHERE user_id = uid;
  DELETE FROM pomodoro_sessions WHERE user_id = uid;
  DELETE FROM daily_plans WHERE user_id = uid;
  DELETE FROM reviews WHERE user_id = uid;
  DELETE FROM quick_memos WHERE user_id = uid;
  DELETE FROM tasks WHERE user_id = uid;
  DELETE FROM projects WHERE user_id = uid;

  -- 项目
  INSERT INTO projects (id, user_id, name, description, color, status) VALUES (gen_random_uuid(), uid, '课程学习', '本学期各门课程的学习任务', '#1890ff', 'ACTIVE') RETURNING id INTO p1;
  INSERT INTO projects (id, user_id, name, description, color, status) VALUES (gen_random_uuid(), uid, '实验室项目', '基于深度学习的图像识别研究', '#52c41a', 'ACTIVE') RETURNING id INTO p2;
  INSERT INTO projects (id, user_id, name, description, color, status) VALUES (gen_random_uuid(), uid, '个人提升', '阅读、运动、技能学习', '#faad14', 'ACTIVE') RETURNING id INTO p3;
  INSERT INTO projects (id, user_id, name, description, color, status) VALUES (gen_random_uuid(), uid, '社团活动', '学生会与志愿者活动', '#f5222d', 'ACTIVE') RETURNING id INTO p4;
  INSERT INTO projects (id, user_id, name, description, color, status) VALUES (gen_random_uuid(), uid, '毕业设计', '毕业论文相关事项', '#722ed1', 'ARCHIVED') RETURNING id INTO p5;

  -- 任务
  INSERT INTO tasks (id, user_id, name, description, priority, status, project_id, estimated_pomodoros, completed_pomodoros, due_date) VALUES (gen_random_uuid(), uid, '完成高数作业第三章', 'P50-P80 习题 3.1-3.5', 'HIGH', 'IN_PROGRESS', p1, 4, 1, today + 2) RETURNING id INTO t1;
  INSERT INTO tasks (id, user_id, name, description, priority, status, project_id, estimated_pomodoros, completed_pomodoros, due_date) VALUES (gen_random_uuid(), uid, '复习线性代数', '矩阵运算与行列式', 'MEDIUM', 'TODO', p1, 3, 0, today + 5) RETURNING id INTO t2;
  INSERT INTO tasks (id, user_id, name, description, priority, status, project_id, estimated_pomodoros, completed_pomodoros, due_date) VALUES (gen_random_uuid(), uid, '准备英语六级词汇', '背完Unit 5-8', 'LOW', 'TODO', p1, 6, 0, today + 14) RETURNING id INTO t3;
  INSERT INTO tasks (id, user_id, name, description, priority, status, project_id, estimated_pomodoros, completed_pomodoros, due_date) VALUES (gen_random_uuid(), uid, '搭建CNN模型基线', '使用PyTorch实现ResNet-18', 'HIGH', 'TODO', p2, 8, 0, today + 7) RETURNING id INTO t4;
  INSERT INTO tasks (id, user_id, name, description, priority, status, project_id, estimated_pomodoros, completed_pomodoros, due_date) VALUES (gen_random_uuid(), uid, '阅读论文Attention Is All You Need', '理解Transformer架构', 'HIGH', 'DONE', p2, 3, 3, yesterday) RETURNING id INTO t5;
  INSERT INTO tasks (id, user_id, name, description, priority, status, project_id, estimated_pomodoros, completed_pomodoros, due_date) VALUES (gen_random_uuid(), uid, '数据预处理脚本', '清洗和增强训练数据集', 'MEDIUM', 'IN_PROGRESS', p2, 5, 2, today + 3) RETURNING id INTO t6;
  INSERT INTO tasks (id, user_id, name, description, priority, status, project_id, estimated_pomodoros, completed_pomodoros, due_date) VALUES (gen_random_uuid(), uid, '阅读《深度工作》', '前5章', 'MEDIUM', 'TODO', p3, 4, 0, today + 10) RETURNING id INTO t7;
  INSERT INTO tasks (id, user_id, name, description, priority, status, project_id, estimated_pomodoros, completed_pomodoros, due_date) VALUES (gen_random_uuid(), uid, '跑步5公里', '每周三次', 'LOW', 'TODO', p3, 1, 0, NULL) RETURNING id INTO t8;
  INSERT INTO tasks (id, user_id, name, description, priority, status, project_id, estimated_pomodoros, completed_pomodoros, due_date) VALUES (gen_random_uuid(), uid, '整理活动报名名单', '汇总各班级报名信息', 'HIGH', 'DONE', p4, 2, 2, yesterday) RETURNING id INTO t9;
  INSERT INTO tasks (id, user_id, name, description, priority, status, project_id, estimated_pomodoros, completed_pomodoros, due_date) VALUES (gen_random_uuid(), uid, '撰写开题报告', '论文开题报告初稿', 'MEDIUM', 'ARCHIVED', p5, 10, 10, week_ago) RETURNING id INTO t10;

  -- 番茄钟
  INSERT INTO pomodoro_sessions (user_id, task_id, start_time, end_time, duration_minutes, type, status, notes) VALUES
    (uid, t1, today + time '08:00', today + time '08:25', 25, 'WORK', 'COMPLETED', '专注完成习题3.1-3.2'),
    (uid, t1, today + time '08:30', today + time '08:35', 5, 'SHORT_BREAK', 'COMPLETED', ''),
    (uid, t6, today + time '09:00', today + time '09:25', 25, 'WORK', 'COMPLETED', '完成了数据归一化模块'),
    (uid, t6, today + time '10:00', NULL, 25, 'WORK', 'INTERRUPTED', '正在写数据增强逻辑'),
    (uid, t5, yesterday + time '14:00', yesterday + time '14:25', 25, 'WORK', 'COMPLETED', '精读前4页'),
    (uid, t5, yesterday + time '14:30', yesterday + time '14:55', 25, 'WORK', 'COMPLETED', '精读第5-8页，做笔记'),
    (uid, t5, yesterday + time '15:00', yesterday + time '15:25', 25, 'WORK', 'COMPLETED', '完成论文阅读，整理思维导图'),
    (uid, t9, yesterday + time '10:00', yesterday + time '10:25', 25, 'WORK', 'COMPLETED', '汇总完毕');

  -- 每日计划
  INSERT INTO daily_plans (user_id, date, core_task_id, status, morning_reflection, evening_review, notes) VALUES
    (uid, today, t1, 'PLANNED', '今天最重要的任务是完成高数作业，然后推进数据预处理。保持专注！', '', '上午8-10点专注时段'),
    (uid, yesterday, t5, 'COMPLETED', '今天核心任务：读完Transformer论文。', '完成了论文阅读，理解了Self-Attention机制，明天开始搭建模型。', '效率不错，完成了3个番茄钟'),
    (uid, two_days_ago, t9, 'COMPLETED', '今天核心任务：汇总各班级报名信息，务必在下午前完成。', '报名名单整理完成，共汇总8个班级。下午还顺便复习了线性代数第一章。', '比预期顺利，2个番茄钟就完成了'),
    (uid, six_days_ago, t4, 'COMPLETED', '今天集中精力搭建CNN模型基线，争取完成PyTorch环境配置和数据加载。', 'ResNet-18模型搭建完成，跑通了第一个epoch。数据加载部分还需优化速度。', '环境配置花了比预期多的时间，但模型跑通了'),
    (uid, week_ago, t10, 'REVIEWED', '必须写完开题报告！', '开题报告完成并提交，导师反馈良好。', '超常发挥，一口气完成10个番茄钟');

  -- 回顾
  INSERT INTO reviews (user_id, type, date, content, completed_tasks_count, total_pomodoros) VALUES
    (uid, 'DAILY', two_days_ago, '今天完成了活动报名名单汇总，效率不错只用了2个番茄钟。还复习了线性代数，感觉矩阵运算部分还需要多练习。', 1, 2),
    (uid, 'DAILY', six_days_ago, 'CNN模型基线搭建完成！ResNet-18成功跑通。环境配置比预期多花了些时间，但最终结果令人满意。', 1, 8),
    (uid, 'DAILY', yesterday, '昨天完成了Transformer论文精读（3个番茄钟），整理了活动名单。核心任务完成，效率评分8/10。', 2, 4),
    (uid, 'WEEKLY', week_ago, '本周完成了开题报告、论文初读、数据预处理脚本一半。总计完成12个番茄钟。下周重点：CNN模型搭建。', 5, 12),
    (uid, 'DAILY', today, '', 0, 0);

  -- 随手清单
  INSERT INTO quick_memos (user_id, content, is_done) VALUES
    (uid, '买实验记录本', false), (uid, '预约图书馆座位', false), (uid, '给导师发邮件确认实验方案', false),
    (uid, '打印课件第三章', true), (uid, '取快递', true);

  -- 代币
  INSERT INTO token_records (user_id, amount, source, claimed, created_at, claimed_at) VALUES
    (uid, 60, '首次番茄钟', true, today + time '08:26', today + time '08:26'),
    (uid, 40, '番茄钟', true, today + time '08:26', today + time '08:26'),
    (uid, 40, '番茄钟', true, today + time '09:26', today + time '09:26'),
    (uid, 20, '创建任务', true, today + time '07:00', today + time '07:00'),
    (uid, 20, '完成任务', true, yesterday + time '16:00', yesterday + time '16:00'),
    (uid, 20, '确定核心任务', true, today + time '07:30', today + time '07:30'),
    (uid, 40, '晨间规划', true, today + time '07:31', today + time '07:31'),
    (uid, 40, '晚间回顾', true, yesterday + time '21:00', yesterday + time '21:00'),
    (uid, 60, '每日计划完成', true, yesterday + time '21:01', yesterday + time '21:01'),
    (uid, 40, '写笔记', true, yesterday + time '21:30', yesterday + time '21:30'),
    (uid, 20, '创建清单', true, today + time '09:00', today + time '09:00'),
    (uid, 20, '完成清单', true, yesterday + time '15:00', yesterday + time '15:00'),
    (uid, 40, '抽扭蛋', true, yesterday + time '20:00', yesterday + time '20:00'),
    (uid, 400, '周任务·完成核心任务 5 天', true, today + time '10:00', today + time '10:00'),
    (uid, 400, '周任务·番茄钟 40 个', true, today + time '10:01', today + time '10:01'),
    (uid, 40, '番茄钟', true, two_days_ago + time '09:00', two_days_ago + time '09:00'),
    (uid, 40, '番茄钟', true, two_days_ago + time '10:00', two_days_ago + time '10:00'),
    (uid, 50, '番茄钟', true, six_days_ago + time '14:00', six_days_ago + time '14:00'),
    (uid, 50, '番茄钟', true, six_days_ago + time '15:00', six_days_ago + time '15:00'),
    (uid, 50, '番茄钟', true, six_days_ago + time '16:00', six_days_ago + time '16:00'),
    (uid, 60, '番茄钟', true, week_ago + time '09:00', week_ago + time '09:00'),
    (uid, 60, '番茄钟', true, week_ago + time '10:00', week_ago + time '10:00'),
    (uid, 60, '番茄钟', true, week_ago + time '11:00', week_ago + time '11:00');

  -- 扭蛋记录
  INSERT INTO gacha_records (user_id, item_id, created_at) SELECT uid, id, yesterday + time '20:00' FROM gacha_items WHERE rarity = 'N' ORDER BY random() LIMIT 8;
  INSERT INTO gacha_records (user_id, item_id, created_at) SELECT uid, id, yesterday + time '20:01' FROM gacha_items WHERE rarity = 'R' ORDER BY random() LIMIT 4;
  INSERT INTO gacha_records (user_id, item_id, created_at) SELECT uid, id, yesterday + time '20:02' FROM gacha_items WHERE rarity = 'SR' ORDER BY random() LIMIT 2;
  INSERT INTO gacha_records (user_id, item_id, created_at) SELECT uid, id, yesterday + time '20:03' FROM gacha_items WHERE rarity = 'SSR' ORDER BY random() LIMIT 1;

  -- 藏品室快照
  INSERT INTO showcase_snapshots (user_id, year_month, bounty_level, pomodoro_level, trophy_level, bounty_value, pomodoro_value, trophy_value)
  VALUES (uid, to_char(today - interval '1 month', 'YYYY-MM'), 2, 1, 1, 9800, 35, 1);

  RAISE NOTICE '测试数据注入完成！';
END $$;
