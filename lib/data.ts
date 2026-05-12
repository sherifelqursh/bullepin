export type Role = "Admin" | "Member" | "Owner";

export type Member = {
  id: string;
  name: string;
  role: Role;
  avatarColor: string; // tailwind bg color when no image
  isYou?: boolean;
};

export type Circle = {
  id: string;
  name: string;
  blurb: string;
  icon: "art" | "chat" | "camera";
  iconBg: string;
  members: number;
  status: "Active now" | string;
  joined: boolean;
};

export type RSVP = "yes" | "no" | "maybe" | null;

export const MOCK_MEMBERS: Member[] = [
  { id: "1", name: "Alex River", role: "Member", avatarColor: "bg-amber-200" },
  { id: "2", name: "Sam (You)", role: "Admin", avatarColor: "bg-sky-200", isYou: true },
  { id: "3", name: "Jamie Chen", role: "Member", avatarColor: "bg-rose-300" },
  { id: "4", name: "Jordan Lee", role: "Member", avatarColor: "bg-sky-100" },
];

export const MOCK_CIRCLES: Circle[] = [
  {
    id: "art-chill",
    name: "Art & Chill",
    blurb: "Low-pressure sketching sessions and creative exploration.",
    icon: "art",
    iconBg: "bg-peach",
    members: 14,
    status: "Active now",
    joined: true,
  },
  {
    id: "deep-chats",
    name: "Deep Chats Only",
    blurb: "A safe space for talking about life, dreams, and everything in between.",
    icon: "chat",
    iconBg: "bg-[#FBE4DD]",
    members: 5,
    status: "8 new posts",
    joined: true,
  },
];

export const MOCK_EVENT = {
  id: "sunset-picnic",
  title: "Sunset Picnic\n& Jam Session",
  when: "Sat, 6:00 PM",
  where: "The Hill Park",
  note: '"Bring your favorite snacks and an instrument if you have one! ✨"',
  yes: ["JD", "AS", "MK", "RL"],
  no: ["BT", "CP"],
};
