export default function getRandomId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10).padStart(8, '0')}`;
}