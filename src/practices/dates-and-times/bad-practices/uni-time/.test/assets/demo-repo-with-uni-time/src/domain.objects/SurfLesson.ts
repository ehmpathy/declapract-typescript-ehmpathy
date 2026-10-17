import { asUniDateTime, type UniDate, type UniDateTime } from '@ehmpathy/uni-time';

export interface SurfLesson {
  bookedAt: UniDateTime;
  lessonDay: UniDate;
}

export const asLessonBookedAt = (input: { at: Date }): UniDateTime =>
  asUniDateTime(input.at);
