'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Headphones, BookOpen, PenTool, Mic, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PracticeContainerProps {
  onSelectExercise: (category: string, type: string) => void;
  currentExercise: { category: string; type: string } | null;
}

const PracticeContainer: React.FC<PracticeContainerProps> = ({
  onSelectExercise,
  currentExercise,
}) => {
  const exerciseData = [
    {
      id: 'listen',
      label: 'Listen (Nghe)',
      icon: <Headphones className="w-4 h-4" />,
      description: 'Rèn luyện khả năng phản xạ và nhận diện âm thanh.',
      items: [
        {
          id: 'dictation',
          name: 'Dictation',
          desc: 'Nghe và chép chính tả toàn bộ câu',
        },
        {
          id: 'match_by_ear',
          name: 'Match by ear',
          desc: 'Nghe và chọn các từ ghép thành câu đúng',
        },
        {
          id: 'spot_error',
          name: 'Spot the error',
          desc: 'Tìm lỗi sai phát âm hoặc chữ viết trong câu',
        },
      ],
    },
    {
      id: 'read',
      label: 'Read (Đọc)',
      icon: <BookOpen className="w-4 h-4" />,
      description: 'Nâng cao vốn từ vựng, ngữ pháp và nhận diện mặt chữ.',
      items: [
        {
          id: 'fill_blank',
          name: 'Fill the blank',
          desc: 'Điền từ thích hợp vào chỗ trống (Trắc nghiệm)',
        },
        {
          id: 'match_translation',
          name: 'Match translation',
          desc: 'Nối các cặp câu phụ đề với nghĩa dịch đúng',
        },
        {
          id: 'pick_translation',
          name: 'Pick translation',
          desc: 'Chọn bản dịch chính xác nhất cho câu vừa nghe',
        },
        {
          id: 'order_lines',
          name: 'Order the lines',
          desc: 'Sắp xếp thứ tự xuất hiện của các câu thoại',
        },
      ],
    },
    {
      id: 'write',
      label: 'Write (Viết)',
      icon: <PenTool className="w-4 h-4" />,
      description: 'Luyện kỹ năng nhớ và viết lại cấu trúc câu hoàn chỉnh.',
      items: [
        {
          id: 'type_blank',
          name: 'Type the blank',
          desc: 'Tự gõ từ còn thiếu vào ô trống',
        },
        {
          id: 'word_order',
          name: 'Word order',
          desc: 'Sắp xếp các từ đã cho thành một câu hoàn chỉnh',
        },
        {
          id: 'translate_blank',
          name: 'Translate blank',
          desc: 'Dịch cụm từ trong ngoặc sang ngôn ngữ đích',
        },
      ],
    },
    {
      id: 'speak',
      label: 'Speak (Nói)',
      icon: <Mic className="w-4 h-4" />,
      description: 'Luyện phát âm, ngữ điệu chuẩn xác theo video gốc.',
      items: [
        {
          id: 'shadowing',
          name: 'Shadowing',
          desc: 'Nhại lại giọng nói theo thời gian thực của video',
        },
      ],
    },
  ];

  return (
    <Tabs defaultValue="listen" className="w-full flex flex-col gap-6">
      <Card className="w-full border shadow-md bg-card/40 backdrop-blur-sm mt-6">
        <CardHeader className="border-b bg-muted/20 select-none">
          {/* Đổi flex tổng thành flex-col để đẩy khối content xuống dưới hàng Tab */}

          <TabsList className="grid grid-cols-2 md:flex md:flex-row h-auto w-full bg-muted/50 p-1.5 rounded-xl gap-1.5">
            {exerciseData.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2.5 justify-center md:justify-start px-4 py-3 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm w-auto md:flex-1"
              >
                {tab.icon}
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </CardHeader>
        <CardContent className="">
          {/* KHU VỰC HIỂN THỊ NỘI DUNG BÀI TẬP (LUÔN FULL WIDTH PHÍA DƯỚI) */}
          <div className="w-full pt-2">
            {exerciseData.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="space-y-4 mt-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <div className="mb-4 border-l-2 border-primary pl-3">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2 select-none">
                    {tab.label}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 select-none">
                    {tab.description}
                  </p>
                </div>

                {/* Danh sách các bài tập con bên trong kỹ năng */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tab.items.map((item) => {
                    const isSelected =
                      currentExercise?.category === tab.id &&
                      currentExercise?.type === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectExercise(tab.id, item.id)}
                        className={`group p-4 rounded-xl border bg-background/50 hover:bg-background transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden select-none hover:shadow-sm ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-sm group-hover:text-primary transition-colors flex items-center justify-between">
                            {item.name}
                            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>

                        <div className="pt-1">
                          <Button
                            size="sm"
                            variant={isSelected ? 'default' : 'outline'}
                            className="w-full text-xs h-8 rounded-lg font-medium pointer-events-none"
                          >
                            {isSelected ? 'Đang kích hoạt' : 'Bắt đầu luyện'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </div>
        </CardContent>
      </Card>
    </Tabs>
  );
};

export default PracticeContainer;
