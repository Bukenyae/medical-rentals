import InfoPageLayout from '@/components/InfoPageLayout';
import AboutSection from '@/components/AboutSection';

export default function AboutPage() {
  return (
    <InfoPageLayout title="About Us" titleAlign="left">
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
          <div className="space-y-4 text-base sm:text-lg leading-relaxed text-gray-700">
            <p>
              Belle Rouge started with one simple dream — to share the warmth of Louisiana with the world.
            </p>
            <p>
              For decades, our family home has been a sanctuary and a refuge for friends and loved ones. As we’ve grown our portfolio of properties, one truth has always guided us: hospitality ain’t just about walls and shelter — it’s about moments. It’s the way a home smells when you walk in,
              the smile that greets you at the door,
              the story shared over a plate of jambalaya, gumbo, crawfish, or red beans and rice.
            </p>
            <p>
              Belle Rouge has grown from a handful of family homes into a modern platform that connects travelers to the true soul of the South — one stay at a time.
            </p>
            <p>
              We use today’s technology to make travel easy and seamless, but we never forget the human touch. Every listing on Belle Rouge is more than just a place to sleep — it’s a doorway to community, culture, and comfort. Whether you’re here for a festival, a family gathering, or a quiet weekend escape, we’ll make sure you feel right at home.
            </p>
            <p>
              Because that’s what we do down here — we don’t just rent homes… we welcome family.
            </p>
          </div>
        </div>
      </section>
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-4">Team</h2>
        </div>
      </section>
      <AboutSection showHeading={false} />
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 sm:pb-16">
          <div className="space-y-4 text-base sm:text-lg leading-relaxed text-gray-700">
            <p>
              For the last decade, Miss Agnes Andrews has built a property portfolio with Southern grace and business sense, turning hospitality into an art form. She’s made sure every guest feels like kin, every home stays cared for, and every detail is handled with love and reliability. When the world started moving faster and travel went digital, Miss Agnes saw not a challenge but a chance — to pass the torch to her daughters and let the next generation carry Belle Rouge into the future.
            </p>
            <p>
              Today, Kinda and Nayo Andrews bring that same heart and heritage into a new era of travel. With modern tools, creative vision, and a deep respect for what their mama built, they’ve transformed Belle Rouge into a platform that blends tradition with technology — keeping the soul of Louisiana hospitality alive in every click, every booking, every stay. Together, this family continues to do what they’ve always done best: open doors, warm hearts, and welcome guests home.
            </p>
          </div>
        </div>
      </section>
    </InfoPageLayout>
  );
}
