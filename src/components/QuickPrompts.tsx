import { Activity, Apple, Moon, Dumbbell } from "lucide-react";

const prompts = [
  {
    icon: Activity,
    label: "Analyze my vitals",
    message: "I'd like to share my recent vitals for analysis. My blood pressure is 130/85, heart rate 78 bpm, and temperature 98.6°F. What do these numbers tell you?",
  },
  {
    icon: Apple,
    label: "Review my diet",
    message: "Can you help me analyze my diet? I typically eat 2 meals a day, mostly fast food, drink about 3 cups of coffee, and rarely eat fruits or vegetables.",
  },
  {
    icon: Moon,
    label: "Sleep issues",
    message: "I've been having trouble sleeping. I usually go to bed around 1 AM, wake up at 6 AM, and feel tired throughout the day. I also use my phone in bed.",
  },
  {
    icon: Dumbbell,
    label: "Fitness plan",
    message: "I'm a 30-year-old who hasn't exercised in months. I sit at a desk all day. Can you suggest a beginner-friendly fitness routine?",
  },
];

interface QuickPromptsProps {
  onSelect: (message: string) => void;
}

export function QuickPrompts({ onSelect }: QuickPromptsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {prompts.map((prompt) => (
        <button
          key={prompt.label}
          onClick={() => onSelect(prompt.message)}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
        >
          <prompt.icon className="h-5 w-5 shrink-0 text-primary" />
          <span className="text-sm font-medium text-card-foreground">{prompt.label}</span>
        </button>
      ))}
    </div>
  );
}
