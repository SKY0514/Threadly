import NotFoundView from "@/components/NotFoundView";

// (chat) 레이아웃(사이드바) 안의 페이지가 notFound()를 쓰면 그 레이아웃까지
// 같이 렌더돼서 사이드바가 남아요. 그런 경우는 notFound() 대신 이 경로로
// redirect해서, (chat) 바깥에서 사이드바 없이 보여줍니다.
const StandaloneNotFoundPage = () => <NotFoundView />;

export default StandaloneNotFoundPage;
