import type { Metadata } from "next";
import "./globals.css";
import "./portal-styles.css";
import "./ink-ui.css";
export const metadata:Metadata={
 title:"Loxada | Manga & Light Novel",
 description:"Manga & Light Novel department account portal",
 robots:{index:false,follow:false}
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
 return <html lang="en"><body>{children}</body></html>;
}
